# build

liunx build system

install [emscripten](https://emscripten.org/) first

```bash
npm install
npm run build
```

# usage

notice: not support for multi app in a single page

```html
<canvas id="cv" width="240" height="180"></canvas>
<script src="./mgba.js"></script>
<script>
    (function () {
        var cv = document.getElementById('cv');
        VBAInterface.createApp(cv)//if not pass canvas, it will try to generate one
            .then(app => {
                console.log(app.canvas);
                //or just leave it empty, drop a file into canvas
                app.loadRom('http://localhost:8080/a.gba');
                window.app = app;
                setTimeout(() => {
                    app.start();
                },1000);
            })
    })()
</script>
```
