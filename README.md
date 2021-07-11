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

By definition, then, this small project is incomplete, but is sufficient to show how to build an SCN that creates Racket code.

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
Obviously, this looks like Scheme code, and the simplicity of the original pattern is lost in Scheme-oriented details.
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
number <- $1:[0-9]+
sum <- $1:prod $2:('+' $3:sum)?
prod <- $1number $2:('*' $3:prod)?
```

Then, the tool will glue the "do that" code onto the pattern and create valid Racket code.

Off-hand, I think we'll just store the pattern and the do-that code as strings in a hash table indexed by the name of the rule.

For example the hash table entry for "number" will contain two strings:
```
$1:[0-9]+
(string->number $1)
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
number -> (string->number $1)
sum -> (if $2 (+ $1 $2) $1)
prod -> (if $2 (* $1 $2) $1)
```
## Org Mode
Emacs displays .md files using its org-mode.

This lets us hit `<TAB>` and elide details. 

The cursor must be positioned on a line that begins with "#".

Hitting `<TAB>` again shows (un-elides) the lines.

Using elision, the reader can concentrate on the _bare essence_ of the match, for example the reader can loo at the `# match` part and elide the `## output` part. You can't understand the `## output` part until you've understood the `# match` part anyway. Why confuse the reader by showing too much at once?

In other words, .md files and org-mode can be used as an IDE for programming.

# First Cut - Identity
The first thing to do is to make a version of the transpiler that "does nothing". It parses the input and then outputs it with no substantial changes.

This approach lets use build and test the pattern matcher in a coherent manner.

I'm using Ohm-JS which skips spaces if the Pattern rules start with capital letters.  This version does not "leave the input alone", since it drops whitespace[^1]. I've added some whitespace to make the identity output look nice.

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
number -> (string->number $1)
sum -> (if $2 (+ $1 $2) $1)
prod -> (if $2 (* $1 $2) $1)
```
## Patterns Specification
```
ex3 {
  Specification = MatchSection OutputSection
  MatchSection = "#"+ "match" Rule+
  OutputSection = "#"+ "output" Emitter+

  Rule = Rid "<-" Pattern+
  Pattern = PatternWithOperator | PatternWithoutOperator
  PatternWithOperator = Primary Operator
  Emitter = Eid "->" codeToEOL

  PatternWithoutOperator = Primary
  Primary = ParenthesizedPrimary | Range | quoted | RuleReference
  ParenthesizedPrimary = "(" Pattern+ ")"
  RuleReference = id ~arrow
  Range = "[" alnum "-" alnum "]"
  quoted = "'" any "'"
  
  Operator = "+" | "?" | "*"
  
  Rid = id &arrow
  Eid = id &arrow
  
  arrow = "<-" | "->"
  
  keyword = "match" | "output" | "<-" | "->"
  id = ~keyword letter alnum*
  
  codeToEOL = (~newline any)* newline+
  newline = "\n"

}
```
## Output Specification
```
  Specification [m o] = [[${m}${o}]]
  MatchSection [@octothorpes m @rules] = [[${octothorpes}${m}\n${rules}]]
  OutputSection [@octothorpes o @emitters] = [[${octothorpes}${o}\n${emitters}]]

  Rule [rid arrow @patterns] = [[${rid}${arrow}${patterns}\n]]
  Pattern [p] = [[${p}]]
  PatternWithOperator [prim op] = [[${prim}${op}]]
  PatternWithoutOperator [prim] = [[${prim}]]
  Emitter [id arrow code] = [[${id}${arrow}${code}]]

  Primary [p] = [[${p}]]
  ParenthesizedPrimary [lpar @p rpar] = [[${lpar}${p}${rpar}]]
  RuleReference [id] = [[${id}]]
  Range [lbracket c1 minus c2 rbracket] = [[${lbracket}${c1}${minus}${c2}${rbracket}]]
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

<h1>Racket PEG Transpolar Workbench</h1>

<p>grammar:</p>
<textarea id="grammar" name="a" rows="1" cols="90" placeholder="grammar" style="background-color:oldlace;">
ex3 {
  Specification = MatchSection OutputSection
  MatchSection = "#"+ "match" Rule+
  OutputSection = "#"+ "output" Emitter+

  Rule = Rid "<-" Pattern+
  Pattern = PatternWithOperator | PatternWithoutOperator
  PatternWithOperator = Primary Operator
  Emitter = Eid "->" codeToEOL

  PatternWithoutOperator = Primary
  Primary = ParenthesizedPrimary | Range | quoted | RuleReference
  ParenthesizedPrimary = "(" Pattern+ ")"
  RuleReference = id ~arrow
  Range = "[" alnum "-" alnum "]"
  quoted = "'" any "'"
  
  Operator = "+" | "?" | "*"
  
  Rid = id &arrow
  Eid = id &arrow
  
  arrow = "<-" | "->"
  
  keyword = "match" | "output" | "<-" | "->"
  id = ~keyword letter alnum*
  
  codeToEOL = (~newline any)* newline+
  newline = "\n"

}
</textarea>

<p>semantics:</p>
<textarea id="semantics" rows="1" cols="90" placeholder="semantics" style="background-color:oldlace;">
  Specification [m o] = [[${m}${o}]]
  MatchSection [@octothorpes m @rules] = [[${octothorpes}${m}\n${rules}]]
  OutputSection [@octothorpes o @emitters] = [[${octothorpes}${o}\n${emitters}]]

  Rule [rid arrow @patterns] = [[${rid}${arrow}${patterns}\n]]
  Pattern [p] = [[${p}]]
  PatternWithOperator [prim op] = [[${prim}${op}]]
  PatternWithoutOperator [prim] = [[${prim}]]
  Emitter [id arrow code] = [[${id}${arrow}${code}]]

  Primary [p] = [[${p}]]
  ParenthesizedPrimary [lpar @p rpar] = [[${lpar}${p}${rpar}]]
  RuleReference [id] = [[${id}]]
  Range [lbracket c1 minus c2 rbracket] = [[${lbracket}${c1}${minus}${c2}${rbracket}]]
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
number -> (string->number $1)
sum -> (if $2 (+ $1 $2) $1)
prod -> (if $2 (* $1 $2) $1)
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

Let's begin by getting 
```
[0-9]+
```
to come out as
```
(+ (range #\0 #\9))
```
## Step 1
We change the _range_ output code to:
```
range [lbracket c1 dash c2 rbracket] = [[(range ${c1} ${c2})]]
```

Test. Now the output is
```
# match
number <- (range 0 9)+ 
sum <- prod ('+' sum)? 
prod <- number ('*' prod)? 

## output
number -> (string->number $1)
sum -> (if $2 (+ $1 $2) $1)
prod -> (if $2 (* $1 $2) $1)
```

That looks good.

Of course, the code is partly Scheme and partly PEG - good for neither.  That's OK.

## Step 2
Let's move the operator to the front and make it more Lisp-y
Change
```
Pattern [pattern operator] = [[${pattern}${operator} ]]
```
to
```
Pattern [pattern operator] = [[(${operator} ${pattern})]]
```

Test again. 

Squint at the "number" rule - it looks OK, but, the "sum" rule looks screwy now.

```
# match
number <- (+ (range 0 9))
sum <- ( prod)( ('+')( sum)?)
prod <- ( number)( ('*')( prod)?)

## output
number -> (string->number $1)
sum -> (if $2 (+ $1 $2) $1)
prod -> (if $2 (* $1 $2) $1)
```

## Step 2a Pattern Splitting

The problem with the "sum" rule is due to the fact that we _always_ wrap sub-patterns in parentheses.

We want to output wrapper parentheses only when _operator_ is non-null.

One solution is to wrap the output code in an _if-then-else_.

But, the pattern-matching engine can do this work for us. The engine should tell us when an operator is present and when there's no operator.

To get the engine to help us this way, we need to split the Pattern rule into two - one rule for when an operator is present and one when there is no operator.

We need to revamp the pattern-matcher specification _and_ we need to revamp the output code:

This is the new pattern-matcher code at that point:
```
Pattern = PatternWithOperator | PatternWithoutOperator
PatternWithOperator = PrimaryPattern Operator
PatternWithoutOperator = PrimaryPattern
```

and, this is the new output code at that point:
```
Pattern [p] = [[${p}]]
PatternWithOperator [pattern operator] = [[(${operator} ${pattern})]]
PatternWithoutOperator [pattern] = [[${pattern}]]
```

We've added two new rules (PatternWithOperator and PatternWithoutOperator) and, even though the spec is longer (by 2 lines in each section), the result is more human-readable than if it contained _if-then-else_ code.

Now, the output is:
```
# match
number <- (+ (range 0 9))
sum <- prod('+'sum)?
prod <- number('*'prod)?

## output
number -> (string->number $1)
sum -> (if $2 (+ $1 $2) $1)
prod -> (if $2 (* $1 $2) $1)
```

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
