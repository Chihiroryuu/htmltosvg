function applyCSS(){

    const css =
        document.getElementById("cssEditor").value;

    document
        .getElementById("dynamicStyle")
        .innerHTML = css;
}

/* DOWNLOAD */
function downloadFile(){

    const type =
        document.getElementById("exportType").value;

    const svg =
        document.getElementById("svgCanvas")
        .outerHTML;

    if(type === "svg"){

        download(
            svg,
            "animation.svg",
            "image/svg+xml"
        );
    }

    if(type === "html"){

        const html = `
<!DOCTYPE html>
<html>
<body>
${svg}
</body>
</html>
        `;

        download(
            html,
            "animation.html",
            "text/html"
        );
    }

    if(type === "gif"){

        alert(
            "GIF export membutuhkan library tambahan seperti gif.js atau ffmpeg."
        );
    }
}

function download(content, fileName, type){

    const blob =
        new Blob([content], {type});

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download = fileName;

    a.click();

    URL.revokeObjectURL(url);
}

/* INIT */
applyCSS();
