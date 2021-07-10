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
