# Toasty.js - A Modern Vanilla JS Toast Library

Toasty.js is a lightweight, dependency-free notification library based on Toastr.js.  
It provides a modernized, object-oriented, vanilla JavaScript alternative to Toastr, with support for progress bars, close buttons, custom timeouts, and more.

## Features

✔️ Pure vanilla JavaScript – No dependencies  
✔️ Progress bars, close buttons, auto-dismiss  
✔️ Object-oriented API – Create multiple instances  
✔️ Customizable positioning, animations, and styling  
✔️ Small and fast, optimized for performance  
✔️ Works with WordPress, any framework, or plain HTML  

---

## Installation

### Option 1: Download & Include in HTML

```html
<link rel="stylesheet" href="toasty.css">
<script src="toasty.js"></script>
```

---

## Usage Example

### 1. Instantiate Toasty

```js
const toaster = new Toasty({ closeButton: true, progressBar: true });
```

### 2. Show Notifications

```js
toaster.success("Operation successful!", "Success");
toaster.error("Something went wrong!", "Error");
```

### 3. (Optional) Customize Global Defaults

```js
toaster.setOptions({
  timeOut: 4000,
  positionClass: 'toast-bottom-right'
});
```

---

## Customization

You can pass options when creating a `Toasty` instance or update them globally using `.setOptions()`.

```js
const toaster = new Toasty({
  closeButton: true,
  progressBar: true,
  timeOut: 5000,
  positionClass: "toast-bottom-right",
  newestOnTop: true
});
```

### Available Options:

| Option           | Type    | Default | Description |
|-----------------|--------|---------|-------------|
| `closeButton`   | Boolean | `false` | Show a close button (`true`/`false`) |
| `progressBar`   | Boolean | `false` | Show a progress bar |
| `timeOut`       | Number  | `5000`  | Auto-dismiss timeout in ms (`0` = sticky) |
| `positionClass` | String  | `"toast-top-right"` | Position of the toast (`top-right`, `bottom-left`, etc.) |
| `newestOnTop`   | Boolean | `true`  | Display newest toast on top |

---

## License

Toasty.js is licensed under the MIT License.  
See [`LICENSE`](./LICENSE) for more details.

---

## Credits

- **Inspired by:** [Notifer.js](https://github.com/Srirangan/notifer.js)  
- **Based on:** [Toastr.js](https://github.com/CodeSeven/toastr)  
- **Original Toastr Authors:**  
  - John Papa, Hans Fjällemark, Tim Ferrell  
  - ARIA Support: Greta Krafsig  
- **Maintained & extended by:** Rendar

---

Want to contribute? Feel free to open an issue or a pull request!  
Like this project? ⭐ Star it on GitHub!
