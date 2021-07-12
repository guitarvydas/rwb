---
layout: post
title:  "RWB - Racket SCN Workbench"
---
# Introduction

In this project, I build a tool that separates implementation details from the top-level grammar and show how to generate "#lang peg" Racket code.

I use a PEG to generate PEG code for Racket.

In other words, I show how to write a DSL for writing DSLs.

# Motivations

I like to see _architecture_ separated from _implementation_. YMMV.

Most PEG tools require the programmer to insert variables and code into the top-level grammar, thereby, making the grammar harder to read and understand.

## SCN

As an aside, I show that you don't need to generalize code to produce something useful.

That is the SCN - Solution Centric Notation - philosophy.

I believe that you can write SCN's in only a few hours (maybe 10's of minutes), which changes the landscape of how to write code. This is [FDD](https://guitarvydas.github.io/2021/04/23/Failure-Driven-Design.html) philosophy. I suggest that you knock off a few SCNs for every project, instead of manually writing code for the project. The code for the project can be automatically re-generated from the SCNs.

# Disclaimer

I concentrate only on [Racket PEG Example 3](https://docs.racket-lang.org/peg/index.html) for clarity.

This small project is only sufficient to show how to build an SCN that creates Racket code.

I expect that this project could be extended by any competent programmer.

# Pattern Match
Example 3 of the Racket PEG documentation shows a simple pattern-matcher (aka grammar) for a calculator:
```
#lang peg
number <- res:[0-9]+ -> (string->number res);
sum <- v1:prod ('+' v2:sum)? -> (if v2 (+ v1 v2) v1);
prod <- v1:number ('*' v2:prod)? -> (if v2 (* v1 v2) v1);
```
This pattern-matcher includes variables and Racket code, all of which makes the pattern-matcher harder to read.

I'll try to make it easier to read.

# Desired Output
The Example 3 documentation shows the following Racket (Scheme) code for the above pattern matcher:
```
(define-peg number (name res (+ (range #\0 #\9)))
  (string->number res))
(define-peg sum
  (and (name v1 prod) (? (and #\+ (name v2 sum))))
  (if v2 (+ v1 v2) v1))
(define-peg prod
  (and (name v1 number) (? (and #\* (name v2 prod))))
  (if v2 (* v1 v2) v1))
```
Obviously, this looks like Racket/Scheme code, and the simplicity of the original pattern is lost in Scheme-oriented details.
# DE-noising the Pattern
We really want to say "match this", "then, do that with the matches".

Something like this:
```
number <- [0-9]+
sum <- prod ('+' sum)?
prod <- number ('*' prod)?
```

```
number -> (string->number $1)
sum -> (if $2 (+ $1 $2) $1)
prod -> (if $2 (* $1 $2) $1)
```

where "$" is just another character that is a valid part of a name (if this were JS, we might use "_" instead of "$", but Racket lets us use "$").

At the moment, `#lang peg` does not allow variables that begin with "$".  Racket allows "$", but the "#land peg" module of Racket does not allow them. So, we'll use "v" instead in this example - if this was a production project instead of an example project, we might want to name-mangle variables using some more hoary prefix (or, we might want to hack on the internals of "#lang peg"), but that would detract from the readability of this example.

We could be fancier than this, using _v1_ and _v2_ and some _let_ expressions, but let's go for low-hanging fruit first.

## Fancier

For the record, we _could_ write the "do that" code as:

```
number [v1] -> (string->number v1)
sum [v1 v2 v3 v4] -> (if v2 (+ v1 v2) v1)
prod [v1 v2 v3 v4] -> (if v2 (* v1 v2) v1)
```

In fact, we might notice that there are 2 top-level matches and that the second match contains 2 sub-matches. 

Riffing on that idea, we might write:
```
number [v1] -> (string->number v1)
sum [v1 v2] -> (if v2/1 (+ v1 v2/1) v1)
prod [v1 v2] -> (if v2/1 (* v1 v2/1) v1)
```

Maybe we would want to use `[]` or maybe `.` for the sub-matches. 

There is a plethora of choices.

Let's stick to the low-hanging fruit first.

Syntax is cheap. 

We can always write a pre-filter later, if it seems worth the time.

## One Possible Solution

Let's think about building a tool that allows us to write matches and "do that" code as above.

The tool converts our new syntax into valid Racket code.

I like to use the term _notation_ instead of the phrase "new syntax". A SCN - Solution-Centric Notation - to be exact.

The tool will convert the de-noised pattern into an internal form:
```
number <- $0:[0-9]+
sum <- $1:prod $2:('+' $3:sum)?
prod <- $1number $2:('*' $3:prod)?
```

Then, the tool will glue the "do that" code onto the pattern and create valid Racket code.

Off-hand, I think we'll just store the pattern and the do-that code as strings in a hash table indexed by the name of the rule.

For example the hash table entry for "number" will contain two strings:
```
v0:[0-9]+
(string->number v0)
```

That looks easy. Even a machine can do this...

# Simple Workbench
# Markdown
I'm going to insert extra lines to help the transpiler.

Note that the lines begin with "#" and "##" which is _markdown_ syntax.
```
# match:
number <- [0-9]+
sum <- prod ('+' sum)?
prod <- number ('*' prod)?

## output:
number -> (string->number v0)
sum -> (if v2 (+ v0 v2) v0)
prod -> (if v2 (* v0 v2) v0)
```

[_Note that, at the moment, the programmer needs to use the correct variable names "v0", "v1", etc. Let's work only on the low-hanging fruit first, then, if we really want to, we can write pre-filters that provide a better UX._]

## Org Mode
Emacs displays .md files using its org-mode.

This lets us hit `<TAB>` and elide details. 

The cursor must be positioned on a line that begins with "#".

Hitting `<TAB>` again shows (un-elides) the lines.

Using elision, the reader can concentrate on the _bare essence_ of the match, for example the reader can loo at the `# match` part and elide the `## output` part. You can't understand the `## output` part until you've understood the `# match` part anyway. Don't confuse the reader by showing too much at once.

In other words, .md files and org-mode can be used as an IDE for programming.

# First Cut - Identity
The first thing to do is to make a version of the transpiler that "does nothing". It parses the input and then outputs it with no substantial changes.

This approach lets us build and test the pattern matcher in a step-wise manner.

I'm using Ohm-JS which skips spaces if the pattern rule names start with capital letters.  This version does not "leave the input alone", since it drops whitespace[^1]. I've added some whitespace to make the identity output look nice.

[^1]: It is actually possible to write a true identity grammar in Ohm-JS. For this, we would use rules that begin with lower-case letters and worry about whitespace. Most PEG libraries work this way, only. Ohm-JS was designed to elide whitespace - the idea being to keep the grammar architecture "clean". Most compilers drop whitespace early on, since it only gets in the way. Being able to write identity grammars (whitespace preserving grammars) makes it easier to think about building SCNs.  This may seem to be a small detail, but when small things get in the way, creativity drops. [Details kill](https://guitarvydas.github.io/2021/03/17/Details-Kill.html).  Programming is hard-enough. Suppressing details enables higher-level thought.

I list the code for the 3 input sections.

The full .HTML file is listed further below. The [ex3.html](https://github.com/guitarvydas/rwb) code is on github.

## Source
```
# match
number <- [0-9]+
sum <- prod ('+' sum)?
prod <- number ('*' prod)?

## output
number -> (string->number v0)
sum -> (if v2 (+ v0 v2) v0)
prod -> (if v2 (* v0 v2) v0)
```
## Patterns Specification
```
ex3 {
  Specification = MatchSection OutputSection
  MatchSection = "#"+ "match" Rule+
  OutputSection = "#"+ "output" Emitter+

  Rule = Rid "<-" Patterns

  Patterns = MultiplePatterns | SinglePattern
  MultiplePatterns = Pattern Pattern+
  SinglePattern = Pattern

  Pattern = PatternWithOperator | PatternWithoutOperator
  PatternWithOperator = Primary Operator
  PatternWithoutOperator = Primary
  Emitter = Eid "->" codeToEOL

  Primary = ParenthesizedPrimary | Range | quoted | RuleReference
  ParenthesizedPrimary = "(" Patterns ")"
  RuleReference = id ~arrow
  Range = "[" alnum "-" alnum "]"
  quoted = "'" any "'"
  
  Operator = "+" | "?" | "*"
  
  Rid = id &arrow
  Eid = id &arrow
  
  arrow = "<-" | "->"
  
  keyword = "match" | "output"
  id = ~keyword letter alnum*
  
  codeToEOL = (~newline any)* newline+
  newline = "\n"

}
```
## Output Specification
```
  Specification [m o] = {{createEmptyTables();}}[[#lang peg\n${constructpeg()}]]
  MatchSection [@octothorpes m @rules] = [[#lang peg\n${octothorpes}${m}\n${rules}]]
  OutputSection [@octothorpes o @emitters] = [[${octothorpes}${o}\n${emitters}]]

  Rule [id arrow patterns] = {{resetVariables()}}[[${addRule(id,patterns)}${id}${arrow}${patterns}\n]]
  Patterns [p] = [[${p}]]
  MultiplePatterns [p @more] = [[${p}${more}]]
  SinglePattern [p] = [[${p}]]
  Pattern [p] = [[${genvar()}:${p} ]]
  PatternWithOperator [prim op] = [[${prim}${op}]]
  PatternWithoutOperator [prim] = [[${prim}]]
  
  Emitter [id arrow code] = [[${addEmitter(id,code)}${id}${arrow}${code}]]

  Primary [p] = [[${p}]]
  ParenthesizedPrimary [lpar p rpar] = [[(${p})]]
  RuleReference [id] = [[${id}]]
  Range [lbracket c1 minus c2 rbracket] = [[${lbracket}${c1}-${c2}${rbracket}]]
  quoted [q1 c q2] = [[${q1}${c}${q2}]]
  
  Operator [op] = [[${op}]]
  
  Rid [id lookahead_arrow] = [[${id}]]
  Eid [id lookahead_arrow] = [[${id}]]
  
  arrow [a] = [[${a}]]
  
  keyword [k] = [[${k}]]
  id [l @aln] = [[${l}${aln}]]
  
  codeToEOL [@cs @nls] = [[${cs}${nls}]] 
  newline [c] = [[${c}]]
```
## HTML Racket PEG Workbench - Identity
```
<!DOCTYPE html>
<html>
<head>
<style>
textarea {
}
</style>
</head>
<body>

<h1>Racket PEG Transpilar Workbench</h1>

<p>grammar:</p>
<textarea id="grammar" name="a" rows="1" cols="90" placeholder="grammar" style="background-color:oldlace;">
ex3 {
  Specification = MatchSection OutputSection
  MatchSection = "#"+ "match" Rule+
  OutputSection = "#"+ "output" Emitter+

  Rule = Rid "<-" Patterns

  Patterns = MultiplePatterns | SinglePattern
  MultiplePatterns = Pattern Pattern+
  SinglePattern = Pattern

  Pattern = PatternWithOperator | PatternWithoutOperator
  PatternWithOperator = Primary Operator
  PatternWithoutOperator = Primary
  Emitter = Eid "->" codeToEOL

  Primary = ParenthesizedPrimary | Range | quoted | RuleReference
  ParenthesizedPrimary = "(" Patterns ")"
  RuleReference = id ~arrow
  Range = "[" alnum "-" alnum "]"
  quoted = "'" any "'"
  
  Operator = "+" | "?" | "*"
  
  Rid = id &arrow
  Eid = id &arrow
  
  arrow = "<-" | "->"
  
  keyword = "match" | "output"
  id = ~keyword letter alnum*
  
  codeToEOL = (~newline any)* newline+
  newline = "\n"

}
</textarea>

<p>semantics:</p>
<textarea id="semantics" rows="1" cols="90" placeholder="semantics" style="background-color:oldlace;">
  Specification [m o] = {{createEmptyTables();}}[[#lang peg\n${constructpeg()}]]
  MatchSection [@octothorpes m @rules] = [[#lang peg\n${octothorpes}${m}\n${rules}]]
  OutputSection [@octothorpes o @emitters] = [[${octothorpes}${o}\n${emitters}]]

  Rule [id arrow patterns] = {{resetVariables()}}[[${addRule(id,patterns)}${id}${arrow}${patterns}\n]]
  Patterns [p] = [[${p}]]
  MultiplePatterns [p @more] = [[${p}${more}]]
  SinglePattern [p] = [[${p}]]
  Pattern [p] = [[${genvar()}:${p} ]]
  PatternWithOperator [prim op] = [[${prim}${op}]]
  PatternWithoutOperator [prim] = [[${prim}]]
  
  Emitter [id arrow code] = [[${addEmitter(id,code)}${id}${arrow}${code}]]

  Primary [p] = [[${p}]]
  ParenthesizedPrimary [lpar p rpar] = [[(${p})]]
  RuleReference [id] = [[${id}]]
  Range [lbracket c1 minus c2 rbracket] = [[${lbracket}${c1}-${c2}${rbracket}]]
  quoted [q1 c q2] = [[${q1}${c}${q2}]]
  
  Operator [op] = [[${op}]]
  
  Rid [id lookahead_arrow] = [[${id}]]
  Eid [id lookahead_arrow] = [[${id}]]
  
  arrow [a] = [[${a}]]
  
  keyword [k] = [[${k}]]
  id [l @aln] = [[${l}${aln}]]
  
  codeToEOL [@cs @nls] = [[${cs}${nls}]] 
  newline [c] = [[${c}]]
</textarea>

<p>source:</p>
<textarea id="source" name="source" rows="17" cols="90" placeholder="notation test" style="background-color:oldlace;">
# match
number <- [0-9]+
sum <- prod ('+' sum)?
prod <- number ('*' prod)?

## output
number -> (string->number v0)
sum -> (if v2 (+ v0 v2) v0)
prod -> (if v2 (* v0 v2) v0)
</textarea>

<p>transpiled:</p>
<textarea id="transpiled" name="transpiled" rows="17" cols="90" placeholder="transpiled"  readonly style="background-color:whitesmoke;">
</textarea>
<br>
<br>
<p id="status" > READY </p>

<br>
<button onclick="generate ()">Generate</button>
<script src="../scnwb/ohm.js"></script>
<script src="../scnwb/glue.js"></script>
<script src="../scnwb/scope.js"></script>
<script src="support.js"></script>
<script>


  function generate () {
      let scnGrammar = document.getElementById('grammar').value;
      let notationSource = document.getElementById('source').value;
      let semantics = document.getElementById('semantics').value;
      let generatedSCNSemantics = transpiler (semantics, glueGrammar, "_glue", glueSemantics);

      _ruleInit();
      try {
          document.getElementById('status').innerHTML = "FAILED";
          let semObject = eval('(' + generatedSCNSemantics + ')');
          document.getElementById ("transpiled").value = semObject;
          let tr = transpiler(notationSource, scnGrammar, "_glue", semObject);
          document.getElementById('transpiled').value = tr;
          document.getElementById('status').innerHTML = "OK";
      }
       catch (err) {
          document.getElementById('status').innerHTML = err;
       }
  }
  </script>
</body>
</html>

```
# Output
Once the identity transpiler appears to be working, we can think about outputting the code as intended.

We simply hack on the identity outputter until it does what we want.

## Step 1
Write code in `support.js` that creates unique variable names.

Write code in `support.js` that creates a hash table indexed by name, as stated above. 
1. The table starts out as empty.
2. Each Match rule creates a new entry, indexed by the rule ("#lang peg" rule name).
3. Each Match rule inserts the pattern into the table under the rule name.
4. Each Emitter rules inserts Racket code into the table under the rule name.
5. The top-most rule of the matcher/emitter dumps the table as a readable string.

## Step 2 
Rewrite the Pattern rule in the emitter to generate a new variable for every pattern.
```
Pattern [p] = [[${genvar()}:${p} ]]
```
### Step 2a
Rewrite the Rule emitter to reset the variable name generator for each new rule.

## Step 3
Rewrite the Rule and Emitter emitter rules to add patterns and code to the hash table.

## Finished
That's it.

The pattern matcher/emitter now inputs source code as above and outputs Racket "#lang peg" code with generated variables.

# Variants
We have a usable pattern matcher for our input "language" (I call that an SCN).

To demonstrate emitting patterns as other languages, see the git branch "racket" where I've hacked the emitter to emit raw Racket/Scheme code instead of "#lang peg" code.

It should be easy to emit code for any language that has a PEG library, e.g. Python, JS (PEG.js), Common Lisp (ESRAP), etc, etc. 

## Ideas for Variants
[_untried_]
blo
With a little more work, it should be possible to emit code for any language that supports REGEXP.  PEG is just a superset of REGEXP.  (PEG allows calling rules, REGEXP doesn't.  You would need to figure out how to create the primitive PEG control-flow operations, e.g. AND, OR, ZERO-OR-MORE, ONE-OR-MORE, OPTIONAL at the level of rules (instead of only on the level of characters)).

With a "lot" more work, it should be possible to emit code in WASM. Creating WASM is easy, but you'd have to write/find a PEG library or a REGEXP library for WASM first. In theory, you don't even need a PEG or a REGEXP library.

# See Also

[Blog](https://guitarvydas.github.io)
[References](https://guitarvydas.github.io/2021/01/14/References.html)

<script src="https://utteranc.es/client.js" 
        repo="guitarvydas/guitarvydas.github.io" 
        issue-term="pathname" 
        theme="github-light" 
        crossorigin="anonymous" 
        async> 
</script> 
