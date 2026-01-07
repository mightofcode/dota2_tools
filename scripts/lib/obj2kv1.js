exports.obj2kv1 = function (d) {
    return "\"DOTA2\"\n" + mergeLines(obj2kv1(d))
}
exports.objToNpcKv = function (d) {
    let lines = obj2kv1(d)
    if (lines.length > 2) {
        lines = lines.slice(1, lines.length - 1)
    }
    for (const key in lines) {
        lines[key] = lines[key].slice(4)
    }
    return mergeLines(lines)
}

function data2kv(d) {
    var res = []
    if (typeof (d) == "string") {
        res.push("\"" + d + "\"")
    } else if (typeof (d) == "number") {
        res.push("\"" + d.toString() + "\"")
    } else if (typeof (d) == "boolean") {
        // if (d) {
        //     res.push("true")
        // } else {
        //     res.push("false")
        // }
        if (d) {
            res.push("\"1\"")
        } else {
            res.push("\"0\"")
        }
    } else if (typeof (d) == "object" && Array.isArray(d)) {
        return array2kv(d)
    } else if (typeof (d) == "object") {
        return obj2kv1(d)
    } else {
        console.error("kv1 fail data2kv", typeof (d), d)
    }
    return res
}

function obj2kv1(obj) {
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
        lines.push("    " + "\"" + (key) + "\"" + "    ")
        if (valueLines.length == 1) {
            lines[lines.length - 1] = lines[lines.length - 1] + valueLines[0]
        } else {
            for (const i2 in valueLines) {
                lines.push("    " + valueLines[i2])
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

    lines.push("{")
    var index = 1

    for (const key in obj) {
        const v = obj[key]



        var valueLines = data2kv(v)
        if (valueLines.length >= 1) {
            valueLines[valueLines.length - 1] = valueLines[valueLines.length - 1]
        }
        if (valueLines.length == 1) {
            lines.push("    " + "\"" + index + "\"" + "    " + valueLines[0])
        } else {
            lines.push("    " + "\"" + index + "\"")
            for (const l of valueLines) {
                lines.push("    " + l)
            }
        }

        index += 1
    }
    lines.push("}")
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
    console.log(mergeLines(obj2kv1(obj)))

}