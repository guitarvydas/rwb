function createEmptyTables () {
    let rules = [];
    scopeAdd ('rules', rules);
    return "";
}

function addRule(id, str) {
    let rules = scopeGet('rules');
    rules.push({name: id, pattern: str});
    scopeModify('rules',rules);
    return "";
}

function addEmitter(id, str) {
    let rules = scopeGet('rules');
    let rule = rules.find(r => r.name === id);
    rule.emitter = str;
    return "";
}

function constructpeg () {
    let s = "";
    let rules = scopeGet('rules');
    rules.forEach (r => {
	s += (`\n(define-peg ${r.name} ${r.pattern} ${r.emitter})`);
    });
    return s;
}

function resetVariables () {
    scopeAdd ('variable', 0);
    return "";
}

function genvar () {
    let v = scopeGet ('variable');
    scopeModify ('variable', v+1);
    return "v" + v.toString ();
}
