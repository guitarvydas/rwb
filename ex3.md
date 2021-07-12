# grok
number <- [0-9]+
sum <- prod ('+' sum)?
prod <- number ('*' prod)?

## emit
number -> (string->number v0)
sum -> (if v2 (+ v0 v2) v0)
prod -> (if v2 (* v0 v2) v0)
	
