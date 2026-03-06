

export const classNames = (classes: (string | { [className: string] : boolean })[]) => classes.reduce((acc, n) => {
    if (typeof n == "string") {
        acc.push(n);
    }
    else {
        Object.keys(n).forEach(cn => {
            if (n[cn]) {
                acc.push(cn);
            }
        })
    }

    return acc
}, <string[]>[]).join(" ");