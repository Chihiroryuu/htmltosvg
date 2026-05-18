/* APPLY CSS */
function applyCSS(){

    const css =
        document.getElementById("cssEditor").value;

    document
        .getElementById("dynamicStyle")
        .innerHTML = css;
}

/* EXPORT */
async function downloadFile(){

    const type =
        document.getElementById("exportType").value;

    if(type === "svg"){

        exportSVG();
    }

    if(type === "html"){

        exportHTML();
    }

    if(type === "gif"){

        exportGIF();
    }

    if(type === "mp4"){

        exportMP4();
    }
}

/* SVG */
function exportSVG(){

    const svg =
        document.getElementById("svgCanvas")
        .outerHTML;

    download(
        svg,
        "animation.svg",
        "image/svg+xml"
    );
}

/* HTML */
function exportHTML(){

    const svg =
        document.getElementById("svgCanvas")
        .outerHTML;

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

/* GIF EXPORT */
async function exportGIF(){

    const preview =
        document.getElementById("preview");

    const gif = new GIF({

        workers:2,
        quality:10,

        width:400,
        height:400
    });

    /* Capture Frames */
    for(let i=0;i<20;i++){

        const canvas =
            await html2canvas(preview);

        gif.addFrame(canvas,{
            delay:100
        });

        await wait(100);
    }

    gif.on("finished",function(blob){

        downloadBlob(blob,"animation.gif");
    });

    gif.render();
}

/* MP4 EXPORT */
async function exportMP4(){

    const preview =
        document.getElementById("preview");

    const stream =
        preview.captureStream(30);

    const recorder =
        new MediaRecorder(stream,{

            mimeType:"video/webm"
        });

    let chunks = [];

    recorder.ondataavailable =
        e => chunks.push(e.data);

    recorder.onstop = () => {

        const blob =
            new Blob(chunks,{

                type:"video/webm"
            });

        downloadBlob(
            blob,
            "animation.webm"
        );
    };

    recorder.start();

    setTimeout(()=>{

        recorder.stop();

    },5000);
}

/* DOWNLOAD */
function download(content,name,type){

    const blob =
        new Blob([content],{type});

    downloadBlob(blob,name);
}

function downloadBlob(blob,name){

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download = name;

    a.click();

    URL.revokeObjectURL(url);
}

/* WAIT */
function wait(ms){

    return new Promise(resolve=>{

        setTimeout(resolve,ms);

    });
}

/* INIT */
applyCSS();
