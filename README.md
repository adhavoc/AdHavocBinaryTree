# AdHavocBinaryTree
Javascript library for drawing nice binary trees

I found that I needed to display a binary tree nicely and didn't like the options out there. I came up with an algorithm to display them, but I also wanted to tell others how I did it. And I wanted it to look nice too. So I added some animation in as well.

## To use this:
In the <head> of your HTML page, include this:
```html
<script src="AdHavocBinaryTree.js"></script>
<link rel="stylesheet" type="text/css" media="screen" href="AdHavocBinaryTree.css" />
```

Set your tree in the body with an SVG like this:
```html
<svg id="exampleSvg" xmlns="http://www.w3.org/2000/svg" version="1.1" width="1000px" height="1000px" preserveAspectRatio="xMinYMin meet"></svg>
```

Initialize the tree with some data using javascript like this:
```javascript
var treeText ="<root startNode=\"1\"><node id=\"1\" left=\"2\" right=\"3\"/><node id=\"2\"/><node id=\"3\"/></root>"
var tree = AdHavocBinaryTree.createTreeFromXml(treeText, document.getElementById("exampleSvg"));
```

