# Safari input memory leak in SWC components

This package rolls out an example project to investigate Safari memory leak for input elements. The issue is that a significant number of detached DOM subtrees are not getting garbage collected because of the input elements in the tree.

The bug is logged to https://bugs.webkit.org/show_bug.cgi?id=262219, along with examples on how to reproduce.

This project is based on Kin Blas's example to showcase the bug in Safari found here https://bug-262219-attachments.webkit.org/attachment.cgi?id=467908. This example uses `sp-textfield` to showcase the same memory issue, instead of simple HTML input element.

In our project we patched the `Textfield` component and this project includes the patch we currently use for Webkit.

To run the project locally:

- Clone the repo.
- Install dependencies via `npm install`
- Start the dev server with `npm start`

This will start the project using the patched version of Textfield. The underlying script builds a snapshot of the DOM tree and uses `WeakRefs` to track which nodes are retained after they are detached from the tree.

To test locally, click the `Remove` button under an input, then `Unparent Children` to detach child nodes from the tree. After that, trigger a garbage collection from the `Console` dev tools panel or via terminal with `notifyutil -p org.WebKit.lowMemory`.

Elements that turn red indicate that they've been successfully garbage collected, while the others are retained in memory.

To remove the patch and compare node tree for differences in retained items you can:

- delete the patch file found under `/patches` folder
- remove `textfield` dependency from `node_modules/@spectrum-web-components`
- run `npm install` and `npm start` again

One important thing to mention is that the patch doesn't entirely solve the memory leak issue but manages to minimize the impact to just the input and form wrapper elements being retained.
Below you can see how the results look for the patched VS without patch test examples.

<img width="1409" alt="Screenshot 2024-03-20 at 16 03 21" src="https://github.com/loredanaspataru/swc-input-patch-test/assets/37333191/9fba8a36-58d7-4275-bac8-7f9620723763">
