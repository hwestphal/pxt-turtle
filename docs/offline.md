# Offline editing

## Web application

**[MakeCode](@homeurl@)** is an **HTML5 web application** that's automatically cached locally (saved to your computer or device) when first viewed in your browser. After the web app has loaded you will have everything you need to continue working without an internet connection. If you decide to add an [extension](/extensions), it's possible that you'll again need to connect to the internet to allow the code in the new extension to compile.

### How does it work?

The MakeCode editor, like other web applications, is created using HTML, JavaScript, and some style information. These parts of the editor are all downloaded as various files to your browser. The editor is designed to do as much of work as possible in the browser itself without needing to constantly have contact with the web server. To do this, it asks the browser to download and keep a number of service files which give the editor the same features provided by the **[MakeCode](@homeurl@)** web site. This allows the editor to fully function even when disconnected from the internet, no longer having contact with the web site.

When the editor loads in your browser it tells it to keep the MakeCode service files in the browser's _application cache_. The cache is data storage area managed by the browser where a web application can keep additional files it needs.

### Cloud compilation

When running on actual hardware, the code you write in JavaScript is compiled into instructions which are understood by the processor on the board. Some of the files saved in the application cache are compiled code for the features on the board. To use the hardware features on your board, the editor provides blocks for them that you include in your programs. These blocks are available to your program when they're included as part of an added extension. The code in an extension is in TypeScript and sometimes also in C++. It's necessary to compile this code at least once on the server and then have the compiled files returned to the browser to get cached. Once cached, the editor can use them together with your code, even when offline. This one time compile process is called cloud compilation.

## #target-app

## Hosting MakeCode locally #local-serve

The open source editions of MakeCode can be served locally on your own computer. More experienced users can download the entire [PXT Toolchain](https://github.com/Microsoft/pxt) and use the [command line interface](/cli) (CLI) to compile and deploy scripts locally. PXT provides a great out-of-the-box experience when used with [Visual Studio Code](/code), a lightweight cross-platform code editor. See the @githubUrl@ project page for instructions on setting up a MakeCode local server.
