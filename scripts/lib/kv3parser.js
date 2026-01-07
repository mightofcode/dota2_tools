exports.parse = function (file,params) {

    params=params|| {}
    file = file.replace(/\r\n/g, '\n'); //Change Windows style "\r\n" line breaks to UNIX style "\n"

    if(!params.noComments){
        file = stripComments(file);
    }
    // console.log(1212)
    // console.log(file)

    file = file.trim()
    if (file[0] == "\"") {
        file = "{" + file + "}"
    }
    var state = { pos: 0, file };
    return getValue(state);
}

function firstNonBlankChar(str) {
    const whitespaceChars = [' ', '\t', '\n'];
    var i = 0
    while (i < str.length) {
        if (!whitespaceChars.includes(str.charAt(i))) {
            return str.charAt(i)
        }
        i += 1
    }
    return null
}


function parseObject(file) {
    // console.log("parseObject")
    if (firstNonBlankChar(file) == '{') {
        var index1 = file.indexOf('{')
        var index2 = file.lastIndexOf('}')
        file = file.substring(index1 + 1, index2 - index1 + 2)
        // 
    }
    
    var state = { pos: 0, file };
    var output = {};
    var isname = true; //Are we looking for a variable name or value

    //console.log(file.substring(state.pos))
    // console.log(state.pos,state.file.length)
    while (state.pos < state.file.length) {
        //console.log(123)
        if (isname) {
            var name = getName(state);
            //console.log(name)
            if (!name) break;
            isname = false;
        } else {
            //console.log(file.substring(state.pos))
            var value = getValue(state);

            if (value !== null) {
                output[name] = value;
            } else {
                break;
            }
            isname = true;
        }
        state.pos++;
    }

    return output;
}

function parseArray(file) {
    var output = [];
    var state = { pos: 0, file };

    while (state.pos < file.length) {

        var value = getValue(state);
        if (value !== null) {
            output.push(value);
        } else {
            break;
        }

        state.pos++;
    }

    return output;
}

function stripComments(file) {

    // file = file.replace(//g, "");
    // file = file.replace(/<!--[\s\S]*?-->/g, "");
    //
    file = file.replace(/<!--[\s\S]*?-->/g, ""); //Remove HTML-style comments
    file = file.replace(/\/\/[\s\S]*?\n/g, ""); //Remove single line comments
    file = file.replace(/\/\*[\s\S]*?\*\//g, ""); //Remove multiline comments /* böö */
    return file
}

function findMatchingBracket(state) { //Find matching bracket for bracket at current position
    var pos = state.pos + 1;

    var start = state.file.charAt(state.pos);
    var find = (start == '[') ? ']' : '}';

    var count = 1;
    var isstring = false; //If pointer is in string
    var multiline = false; //If string is multiline
    let strStart=0

    while (true) {
        var char = state.file.charAt(pos);
        // console.log(char)
        switch (char) {
            case start:
                //console.log(char)
                if (!isstring) count++;
                break;
            case find:

                if (!isstring) count--;
                //console.log(char,isstring,count)
                //console.log(state.file.substring(pos, pos + 30))
                if (count == 0) return pos;
                break;
            case '"':

                if (isstring && pos > 0 && state.file.charAt(pos - 1) == '\\') {
                    //  let s=state.file.substring(pos, pos + 30)
                    //  console.log(s)
                    break
                }
                if (state.file.substring(pos, pos + 3) == '"""') {
                    //console.log(state.file.substring(pos, pos + 3))
                    multiline = !multiline;
                    isstring = !isstring;
                    pos += 2;
                } else if (!multiline) {
                    
                    isstring = !isstring;


                    if(isstring){
                        strStart=pos
                        //console.log(isstring, state.file.substring(pos, pos + 100))
                    }else{
                        // console.log(isstring, state.file.substring(strStart, pos+1))
                    }


                    // let s = state.file.substring(pos, pos + 30)
                    // console.log(isstring, state.file.substring(pos, pos + 100))
                    // if (isstring && s.startsWith('"\n')) {
                    //     //console.log(isstring, state.file.substring(pos - 10, pos + 100))
                    //     process.exit(0)
                    // }
                }

                break;
            default:

        }

        pos++;
        if (pos >= state.file.length) {
            // console.log("eof",count)
            return 'eof';
        }
    }
}

function getValue(state) {
    var value = null;
    
    while (state.pos < state.file.length) {
        // console.log(state.pos , state.file.length)
        var char = state.file.charAt(state.pos);
        //console.log(char)
        if (char == '{') {
            var end = findMatchingBracket(state);
            //console.log(end)
            value = parseObject(state.file.substring(state.pos + 1, end));
            //console.log(value)
            state.pos = end;
            break;
        } else if (char == '[') {
            var end = findMatchingBracket(state);
            value = parseArray(state.file.substring(state.pos + 1, end));
            state.pos = end;
            break;
        } else if (char == '"') {
            value = getString(state);
            break;
        } else if (state.file.substring(state.pos, state.pos + 4).toLowerCase() == 'true') {
            state.pos += 4;
            value = true;
            break;
        } else if (state.file.substring(state.pos, state.pos + 5).toLowerCase() == 'false') {
            state.pos += 5;
            value = false;
            break;
        } else if (state.file.substring(state.pos, state.pos + 8).toLowerCase() == 'resource') {
            state.pos += 9;
            value = { type: 'resource', value: getString(state) };
            break;
        } else if (/[-]|[0-9]/.test(char)) {
            value = getNumber(state);
            break;
        }
        state.pos++;
    }
    //console.log(value)
    return value;
}

function getName(state) {

    const whitespaceChars = [' ', '\t', '\n'];

    while (state.pos < state.file.length && whitespaceChars.includes(state.file.charAt(state.pos))) {
        state.pos += 1
    }
    if (state.pos > state.file.length) {
        return false
    }

    if (state.file.charAt(state.pos) == "\"") {
        state.pos++;
        var startpos = state.pos;
        while (state.file.charAt(state.pos) != '"') {
            state.pos++;
            if (state.pos > state.file.length) {
                return false;
            }
        }
        return state.file.substring(startpos, state.pos).trim();
    } else {
        var startpos = state.pos;
        while (state.file.charAt(state.pos) != '=') {
            state.pos++;
            if (state.pos > state.file.length) {
                return false;
            }
        }
        return state.file.substring(startpos, state.pos).trim();
    }

}

function getString(state) {
    var multiline = false;
    var start = state.file.indexOf('"', state.pos);
    if (state.file.substring(start, start + 3) == '"""') {
        multiline = true;
        start = state.file.indexOf('\n', start);
    }

    start++;

    if (multiline) {
        var end = state.file.indexOf('\n"""', start);
        if (end == -1) return null;
        state.pos = end + 3;
    } else {
        var end = start;
        while (true) {
            //console.log("s", end)
            end = state.file.indexOf('"', end);
            //console.log(end)
            //console.log(state.file.slice(end,end+20))
            if (end == -1) return null;
            if (state.file.charAt(end - 1) != '\\') break;
            end = end + 1
        }
        state.pos = end;

    }
    // console.log(multiline, start, end, state.file.substring(start, end))
    return state.file.substring(start, end);
}

function getNumber(state) {
    var startpos = state.pos;
    var isfloat;
    while (true) {
        if (!/[-]|[0-9]/.test(state.file.charAt(state.pos))) {
            if (state.file.charAt(state.pos) == '.') {
                isfloat = true;
            } else {
                break;
            }
        }
        state.pos++;
    }

    if (isfloat) {
        return parseFloat(state.file.substring(startpos, state.pos));
    } else {
        return parseInt(state.file.substring(startpos, state.pos));
    }
}