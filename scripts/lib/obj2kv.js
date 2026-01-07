exports.obj2kv = function(d) {

    return mergeLines(obj2kv(d))
}

function data2kv(d) {
    var res = []
    if (typeof(d) == "string") {
        res.push("\"" + d + "\"")
    } else if (typeof(d) == "number") {
        res.push(d.toString())
    } else if (typeof(d) == "boolean") {
        if (d) {
            res.push("true")
        } else {
            res.push("false")
        }
    } else if (typeof(d) == "object" && Array.isArray(d)) {
        return array2kv(d)
    } else if (typeof(d) == "object") {
        return obj2kv(d)
    } else {
        console.error(typeof(d))
    }
    return res
}

function obj2kv(obj) {
    if (obj == null) {
        return ""
    }
    if (obj["type"] == "resource" && obj["value"]) {
        return ["resource:\"" + obj["value"] + "\""]
    }
    var lines = []
    lines.push("{")
    for (const key in obj) {
        const v = obj[key]
        var valueLines = data2kv(v)
        lines.push("\t" + (key) + " = ")
        if (valueLines.length == 1) {
            lines[lines.length - 1] = lines[lines.length - 1] + valueLines[0]
        } else {
            for (const i2 in valueLines) {
                lines.push("\t" + valueLines[i2])
            }
        }
    }
    lines.push("}")
    return lines
}

function array2kv(obj) {
    if (obj == null) {
        return "[]"
    }
    var lines = []
    lines.push("[")
    for (const key in obj) {
        const v = obj[key]
        var valueLines = data2kv(v)
        if (valueLines.length >= 1) {
            valueLines[valueLines.length - 1] = valueLines[valueLines.length - 1] + ","
        }
        for (const l of valueLines) {
            lines.push("\t" + l)
        }
    }
    lines.push("]")
    return lines
}

function mergeLines(lines) {
    var res = ""
    for (const l of lines) {
        res = res + l + "\n"
    }
    return res
}

function test() {
    const obj = {
        a: 1,
        b: [1, 2, 3, "112", { c: 2 }]
    }
    console.log(mergeLines(obj2kv(obj)))

}