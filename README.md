---
layout: post
title:  "RWB - Racket SCN Workbench"
---
# Introduction
See [Racket PEG Example 3](https://docs.racket-lang.org/peg/index.html).

# Pattern Match
```
#lang peg
number <- res:[0-9]+ -> (string->number res);
sum <- v1:prod ('+' v2:sum)? -> (if v2 (+ v1 v2) v1);
prod <- v1:number ('*' v2:prod)? -> (if v2 (* v1 v2) v1);
```
# Desired Output
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

We could be fancier than this, using v1 and v2 and some _let_ expressions, but let's go for low-hanging fruit first.

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

There is a plethora of choice.

Let's stick to low-hanging fruit first.

Syntax is cheap. 

We can always write a pre-filter later, if it seems worth the time.

## One Solution

Let's think about building a tool that allows us to write matches and "do that" code as above.

The tool converts our new syntax into valid Racket code.

I like to call "new syntax" a _notation_. A SCN - Solution-Centric Notation - to be exact.

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

# First Cut - Identity
The first thing to do is to make a version of the transpiler that "does nothing". It parses the input and then outputs it.

I'm using Ohm-JS which skips spaces if the Pattern rules start with capital letters.  This version does not "leave the input alone", since it drops whitespace. I've added some whitespace to make the identity output look nice.

I list the code for the 3 input sections.

The full .HTML file is listed further below. The [ex3.html]() code is on github.

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

  Emitter = EmitterID "->" codeToEOL

  Rule = RuleID "<-" Pattern+
  Pattern = PrimaryPattern Operator?
  Operator = Optional | ZeroOrMore | OneOrMore
  Optional = "?"
  ZeroOrMore = "*"
  OneOrMore = "+"
  PrimaryPattern = range | quoted | GroupedPattern | RuleReference
  GroupedPattern = "(" Pattern ")"
  range = "[" char "-" char "]"
  char = "A" .. "Z" | "a" .. "z" | "0" .. "9"

  quoted = "'" (~"'" any)* "'"

  RuleReference = id ~arrow
  RuleID = id &"<-"
  EmitterID = id &"->"
  
  arrow = "<-" | "->"
  id = firstChar restChar* &space
  firstChar = ~ws ~delim any
  restChar = ~ws any
  delim = "#" | ":" | "<-" | "->" | "*" | "?" | "+"

  ws = " " | "\t" | newline
  codeToEOL = (~newline any)* newline+
  newline = "\n"
}

```
## Output Specification
```
  Specification [msection osection] = [[${msection}\n${osection}]]
  MatchSection [ @octothorpes m @rules] = [[${octothorpes} ${m}\n${rules}]]
  OutputSection [@octothorpes o @emitters] = [[${octothorpes} ${o}\n${emitters}]]

  Emitter [id arrow code] = [[${id} ${arrow} ${code}]]

  Rule [id arrow @patterns] = [[${id} ${arrow} ${patterns}\n]]
  Pattern [pattern operator] = [[${pattern}${operator} ]]
  Operator [op] = [[${op}]]
  Optional [question] = [[${question}]]
  ZeroOrMore [asterisk] = [[${asterisk}]]
  OneOrMore [plus] = [[${plus}]]
  PrimaryPattern [p] = [[${p}]]
  GroupedPattern [lpar p rpar] = [[${lpar}${p}${rpar}]]
  range [lbracket c1 dash c2 rbracket] = [[${lbracket}${c1}${dash}${c2}${rbracket}]]
  char [c] = [[${c}]]

  quoted [q1 @cs q2] = [[${q1}${cs}${q2}]]

  RuleReference [id] = [[${id}]]
  RuleID [id lookahead_arrow] = [[${id}]]
  EmitterID [id lookahead_arrow] = [[${id}]]
  
  arrow [a] = [[${a}]]
  id [c @cs lookahead_space] = [[${c}${cs}]]
  firstChar [c] = [[${c}]]
  restChar [c] = [[${c}]]
  delim [d] = [[${d}]]

  ws [w] = [[${w}]]
  codeToEOL [@cs @nl] = [[${cs}${nl}]]
  newline [n] = [[${n}]]
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

  Emitter = EmitterID "->" codeToEOL

  Rule = RuleID "<-" Pattern+
  Pattern = PrimaryPattern Operator?
  Operator = Optional | ZeroOrMore | OneOrMore
  Optional = "?"
  ZeroOrMore = "*"
  OneOrMore = "+"
  PrimaryPattern = range | quoted | GroupedPattern | RuleReference
  GroupedPattern = "(" Pattern ")"
  range = "[" char "-" char "]"
  char = "A" .. "Z" | "a" .. "z" | "0" .. "9"

  quoted = "'" (~"'" any)* "'"

  RuleReference = id ~arrow
  RuleID = id &"<-"
  EmitterID = id &"->"
  
  arrow = "<-" | "->"
  id = firstChar restChar* &space
  firstChar = ~ws ~delim any
  restChar = ~ws any
  delim = "#" | ":" | "<-" | "->" | "*" | "?" | "+"

  ws = " " | "\t" | newline
  codeToEOL = (~newline any)* newline+
  newline = "\n"
}


</textarea>

<p>semantics:</p>
<textarea id="semantics" rows="1" cols="90" placeholder="semantics" style="background-color:oldlace;">
  Specification [msection osection] = [[${msection}\n${osection}]]
  MatchSection [ @octothorpes m @rules] = [[${octothorpes} ${m}\n${rules}]]
  OutputSection [@octothorpes o @emitters] = [[${octothorpes} ${o}\n${emitters}]]

  Emitter [id arrow code] = [[${id} ${arrow} ${code}]]

  Rule [id arrow @patterns] = [[${id} ${arrow} ${patterns}\n]]
  Pattern [pattern operator] = [[${pattern}${operator} ]]
  Operator [op] = [[${op}]]
  Optional [question] = [[${question}]]
  ZeroOrMore [asterisk] = [[${asterisk}]]
  OneOrMore [plus] = [[${plus}]]
  PrimaryPattern [p] = [[${p}]]
  GroupedPattern [lpar p rpar] = [[${lpar}${p}${rpar}]]
  range [lbracket c1 dash c2 rbracket] = [[${lbracket}${c1}${dash}${c2}${rbracket}]]
  char [c] = [[${c}]]

  quoted [q1 @cs q2] = [[${q1}${cs}${q2}]]

  RuleReference [id] = [[${id}]]
  RuleID [id lookahead_arrow] = [[${id}]]
  EmitterID [id lookahead_arrow] = [[${id}]]
  
  arrow [a] = [[${a}]]
  id [c @cs lookahead_space] = [[${c}${cs}]]
  firstChar [c] = [[${c}]]
  restChar [c] = [[${c}]]
  delim [d] = [[${d}]]

  ws [w] = [[${w}]]
  codeToEOL [@cs @nl] = [[${cs}${nl}]]
  newline [n] = [[${n}]]
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
