const statusText =
    document.getElementById("status");

/* APPLY CSS */
function applyCSS(){

    const css =
        document.getElementById("cssEditor").value;

    document
        .getElementById("dynamicStyle")
        .innerHTML = css;
}

/* DOWNLOAD */
function download(blob,name){

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download = name;

    a.click();

    URL.revokeObjectURL(url);
}

/* SVG */
function exportSVG(){

    const svg =
        document
        .getElementById("svgCanvas")
        .outerHTML;

    const blob =
        new Blob(
            [svg],
            {type:"image/svg+xml"}
        );

    download(blob,"animation.svg");
}

/* GIF */
async function exportGIF(){

    statusText.innerHTML =
        "Rendering GIF...";

    const preview =
        document.getElementById("preview");

    const gif = new GIF({

        workers:2,
        quality:10,
        width:500,
        height:500
    });

    for(let i=0;i<30;i++){

        const canvas =
            await html2canvas(preview);

        gif.addFrame(canvas,{
            delay:100
        });

        await wait(100);
    }

    gif.on("finished",function(blob){

        download(blob,"animation.gif");

        statusText.innerHTML =
            "GIF Exported";
    });

    gif.render();
}

/* MP4 */
async function exportMP4(){

    statusText.innerHTML =
        "Loading FFmpeg...";

    const { createFFmpeg, fetchFile } =
        FFmpeg;

    const ffmpeg =
        createFFmpeg({
            log:true
        });

    await ffmpeg.load();

    statusText.innerHTML =
        "Capturing frames...";

    const preview =
        document.getElementById("preview");

    for(let i=0;i<60;i++){

        const canvas =
            await html2canvas(preview);

        const blob =
            await new Promise(
                resolve =>
                    canvas.toBlob(resolve)
            );

        ffmpeg.FS(
            "writeFile",
            `frame${i}.png`,
            await fetchFile(blob)
        );

        await wait(100);
    }

    statusText.innerHTML =
        "Encoding MP4...";

    await ffmpeg.run(

        "-framerate","30",

        "-i","frame%d.png",

        "-c:v","libx264",

        "-pix_fmt","yuv420p",

        "output.mp4"
    );

    const data =
        ffmpeg.FS(
            "readFile",
            "output.mp4"
        );

    const blob =
        new Blob(
            [data.buffer],
            {type:"video/mp4"}
        );

    download(blob,"animation.mp4");

    statusText.innerHTML =
        "MP4 Exported";
}

/* WAIT */
function wait(ms){

    return new Promise(resolve=>{

        setTimeout(resolve,ms);

    });
}

/* INIT */
applyCSS();
