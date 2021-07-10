# match:
number <- [0-9]+
sum <- prod ('+' sum)?
prod <- number ('*' prod)?

## output:
number -> (string->number $1)
sum -> (if $2 (+ $1 $2) $1)
prod -> (if $2 (* $1 $2) $1)

