"use strict";

var AdHavocBinaryTree;
(function () {
	AdHavocBinaryTree = {
		ALGORITHM: {
			LEFT_ALIGNED: 1,
			BALANCED: 2,
			FULL_BALANCE: 3
		},
		/** 
		 * This method creates a tree and draws it out.
		 * @param {Number|Array} xml - xml that describes the tree
		 * @param {Element} svg - The document element representing the SVG where the tree will be drawn
		 * @param {ALGORITHM} - Positioning algorithm to use
		 * @returns {Tree} The created tree
		 */
		createTreeFromXml: function(xml, svg, algorithm) {
			var xmlDoc;
			var parser = new DOMParser();
			xmlDoc = parser.parseFromString(xml, "text/xml");

			var rootId = Number(xmlDoc.documentElement.getAttribute("startNode"));	

			// Create the allNodesArray, an ARRAY of all the xml nodes.
			var nodeList = xmlDoc.getElementsByTagName("node");
			var allNodesArray = [];
			var i;
			for (i = nodeList.length; i--; allNodesArray.unshift(nodeList[i]))
				;
		
			return new Tree({"Xml": allNodesArray, "RootId": rootId, "SvgDoc": svg, "Positioning": algorithm});
		}
	}

	// Private properties for BinaryTree
	var SVG_NS = "http://www.w3.org/2000/svg";
	var CIRCLE_RADIUS = 40;
	var CIRCLE_DIST_Y = 100;
	var CIRCLE_DIST_X = CIRCLE_DIST_Y / Math.sqrt(3); // Triangle. Distance between Y is distance between X (considering that X will be doubled.)

	var SVG_LR_PADDING = 5;
	var SVG_TB_PADDING = 5;

	// Private methods
	function _leftPositionForNodePos(x) {return SVG_LR_PADDING + CIRCLE_RADIUS + CIRCLE_DIST_X * x;}
	function _topPositionForNodePos(y) {return SVG_TB_PADDING + CIRCLE_RADIUS + CIRCLE_DIST_Y * y;}
	function _circleId(treeNode) {return "circle_" + treeNode.id;}
	function _lineId(parent, child) {return "line_" + parent.id + "_" + child.id;}
	
	function _clamp(min, num, max) { return Math.max(min, Math.min(num, max));} 

	function TreeNode(opts) {
		this.xPos = 0;
		this.yPos = 0;
		var tree;
		this.left = null;
		this.right = null;
		if (opts.XML) {
			var allNodesArray = opts.XML;
			var rootNodeId = opts.RootId;
			tree = opts.Tree;

			this.id = rootNodeId;
			this.tree = tree;
		
			var rootXmlList = allNodesArray.filter(function(obj) { 
				return Number(obj.getAttribute("id")) === this;
			}, rootNodeId);
		
			if (rootXmlList) {
				var rootXml = rootXmlList[0];
				var leftId = Number(rootXml.getAttribute("left"));
				var rightId = Number(rootXml.getAttribute("right"));
		
				if (leftId) {
					this.left = new TreeNode({"XML": allNodesArray, "RootId": leftId, "Tree": tree});
				}
				if (rightId) {
					this.right = new TreeNode({"XML": allNodesArray, "RootId": rightId, "Tree": tree});
				}
			}
			else {
				return;
			}
		}
		else if (opts.SingleId) {
			tree = opts.Tree;
			this.id = opts.SingleId;
			this.tree = tree;
		}
		else if (opts.Parent) {
			var parent = opts.Parent;
			tree = parent.tree;
		
			this.id = tree._getNextNodeId();
			this.tree = tree;
		}
	}
	TreeNode.prototype._createBranch = function() {
		if (this.IsLeaf()) {
			this.left = new TreeNode({"Parent": this});
			this.right = new TreeNode({"Parent": this}); 

			this.tree.recalculatePositions();
			this.tree.drawTree();
		}
	};
	TreeNode.prototype.IsLeaf = function() {
		return (this.left === null) && (this.right === null);
	};
	/** 
	 * This method recursively positions the tree nodes into a left justified tree.
	 * @param {Number|Array} nextAvailablePositionAtDepthArray An array to track what is the leftmost position still available at any depth.
	 * @param {Number} depth The current depth in the tree
	 */
	TreeNode.prototype._calculateTreeNodePositionsWithLeftAligned = function(nextAvailablePositionAtDepthArray, depth) {
		if (nextAvailablePositionAtDepthArray.length <= depth) {
			nextAvailablePositionAtDepthArray[depth] = 0; 
		}

		this.xPos = nextAvailablePositionAtDepthArray[depth];
		nextAvailablePositionAtDepthArray[depth] += 2;
		this.yPos = depth;
		if (this.left !== null) {
			this.left._calculateTreeNodePositionsWithLeftAligned(nextAvailablePositionAtDepthArray, depth+1);
		}
		if (this.right !== null) {
			this.right._calculateTreeNodePositionsWithLeftAligned(nextAvailablePositionAtDepthArray, depth+1);
		}
	};
	/** 
	 * This method recursively positions the tree nodes into a balanced tree.
	 * @param {Number|Array} nextAvailablePositionAtDepthArray An array to track what is the leftmost position still available at any depth.
	 * @param {Number} leftMargin The leftmost position that this node is allowed to be in. This is used to enforce that the right node is to the right of the parent.
	 * @param {Number} depth The current depth in the tree
	 * @returns {Number} X position used
	 */
	TreeNode.prototype._calculateTreeNodePositionsWithBalancedParent = function(nextAvailablePositionAtDepthArray, leftMargin, depth) {
		// Assert that the nextAvailablePositionAtDepthArray array has an entry for the current depth.
		if (nextAvailablePositionAtDepthArray.length <= depth) {
			nextAvailablePositionAtDepthArray[depth] = 0;
		}
		this.yPos = depth;

		//By default, the x position is has to be at least as left as both the given left margin and the leftmost position available.
		this.xPos = Math.max(nextAvailablePositionAtDepthArray[depth], leftMargin);

		if (!this.IsLeaf()) {
			// Recursively set the left tree, which can be as far left as the nextAvailablePositionAtDepthArray allows
			var leftPos = this.left._calculateTreeNodePositionsWithBalancedParent(nextAvailablePositionAtDepthArray, 0, depth+1);
			
			// After calculating the positioning of the left nodes, we need to make sure our parent node is to the right of it.
			this.xPos = Math.max(this.xPos, leftPos+1);
			
			// Recursively set the right tree, which has to be to the right of the parent node
			var rightPos = this.right._calculateTreeNodePositionsWithBalancedParent(nextAvailablePositionAtDepthArray, this.xPos+1, depth+1);

			// Try and center the middle node if possible. This is a simple adjustment that helps the tree look nice
			var midPos = Math.floor((leftPos + rightPos) / 2);
			if (midPos > this.xPos) {
				this.xPos = midPos;
			}
		}

		// Update the nextAvailablePositionAtDepthArray now that we have decided the X position of the node.
		nextAvailablePositionAtDepthArray[depth] = this.xPos + 2;
		return this.xPos;
	};
	/** 
	 * This method recursively a node and all its children to the right.
	 * @param {Number|Array} lastUsedPositionAtDepthArray - An array being used to  track what is the rightmost position last used at any depth.
	 * @param {Number} depth - The current depth in the tree
	 */
	TreeNode.prototype._shiftTree = function(shift, lastUsedPositionAtDepthArray, depth) {
		if (lastUsedPositionAtDepthArray[depth] === this.xPos) {
			lastUsedPositionAtDepthArray[depth] += shift;
		}
		
		this.xPos += shift;
	
		if (this.right !== null) {
			this.right._shiftTree(shift, lastUsedPositionAtDepthArray, depth+1);
		}
		if (this.left !== null) {
			this.left._shiftTree(shift, lastUsedPositionAtDepthArray, depth+1);
		}
	};
	/** 
	 * This method moves left branches as far right as they can legally go..
	 * @param {Number|Array} lastUsedPositionAtDepthArray An array to track what is the last right position used.
	 * @param {Number} depth The current depth in the tree
	 * @returns {Number|Array} An array of how much each level can be safely shifted to the right
	 */
	TreeNode.prototype._shiftLeftNodesRight = function(lastUsedPositionAtDepthArray, depth) {
		var result;
		if (!this.IsLeaf()) {
			// Go through the right nodes and get information of how far it could be shifted to the right. This
			// will not be used and is to be returned to the caller.
			var rightInfo = this.right._shiftLeftNodesRight(lastUsedPositionAtDepthArray, depth+1);
			
			// Go through the left nodes and get information of how far those nodes can be shifted to the right.
			var leftInfo = this.left._shiftLeftNodesRight(lastUsedPositionAtDepthArray, depth+1);
		
			// How far can the current node be shifted to the right, assuming it doesn't conflict with an existing node and 
			// is still to the left of the right node.
			var currRightLimit = Math.min(lastUsedPositionAtDepthArray[depth] - 2, this.right.xPos - 1);
			var currLeftLimit = this.xPos;	// The current node is already at its furthest left limit
			
			// Get the minimum distance the left nodes can be shifted.
			var leftMin = Math.min.apply(null, leftInfo);
	
			// How far can the left nodes be shifted, while still being to the left of the current node's rightmost limit
			var leftDeltaPossible = Math.min(leftMin, currRightLimit - 1 - this.left.xPos);

			// If there is space, shift the left nodes as much as possible.
			if (leftDeltaPossible > 0) {
				this.left._shiftTree(leftDeltaPossible, lastUsedPositionAtDepthArray, depth+1);
			}
		
			// Determine the ideal position for the current node, in between its two branches. This is where
			// we may get non-integer value, but since we will be done calculating positions after this, it
			// is acceptable.
			var idealCurrPosition = (this.left.xPos + this.right.xPos) / 2.0;
			this.xPos = _clamp(currLeftLimit, idealCurrPosition, currRightLimit);

			// Replace the leftInfo with the rightInfo, up to the depth of the right info.
			// Subtract slide from leftInfo
			var i;
			for (i = 0 ; i < rightInfo.length; i+=1) {
				leftInfo[i] = rightInfo[i];
			}
			for (i=i ; i < leftInfo.length; i+=1) {
				leftInfo[i] -= leftDeltaPossible;
			}
			result = leftInfo;
		}
		else {
			result = [];
		}
		// Add current level to the result
		result.unshift(lastUsedPositionAtDepthArray[depth] - 2 - this.xPos);

		// Update lastUsedPositionAtDepthArray with this level's information
		lastUsedPositionAtDepthArray[depth] = this.xPos;
	
		return result;
	};
	TreeNode.prototype._drawTree = function() {
		var x = _leftPositionForNodePos(this.xPos);
		var y = _topPositionForNodePos(this.yPos);
	
		var left = this.left;
		var right = this.right;
		var className = this.IsLeaf() ? "leafNode" : "parentNode";
	
		var existingCircle = this.tree.svgDoc.getElementById(_circleId(this));
		if (existingCircle) {
			$(existingCircle).velocity({
					cx:x, cy:y
				}, {
					complete: function() {
						existingCircle.setAttributeNS(null, "class", className);
					}
				});
		}
		else {
			var circle = document.createElementNS(SVG_NS, "circle");
			circle.treeNode = this;
			circle.setAttributeNS(null, "cx", x);
			circle.setAttributeNS(null, "cy", y);
			circle.setAttributeNS(null, "r", CIRCLE_RADIUS);
			circle.setAttributeNS(null, "id", _circleId(this));
			circle.setAttributeNS(null, "class", className);
		
			// Make the circle fade in.
			circle.setAttributeNS(null, "opacity", 0);
			$(circle).velocity({opacity:1}, {delay:300});

			circle.addEventListener('click', function(evt){evt.target.treeNode._createBranch();});
			// evt.target is the circle.
			this.tree.svgCircles.appendChild(circle);
		}
		if (left !== null) {
			this._drawLine(left);
			left._drawTree();
		}
		if (right !== null) {
			this._drawLine(right);
			right._drawTree();
		}	
	};
	TreeNode.prototype._drawLine = function(child) {
		var x1 = _leftPositionForNodePos(this.xPos);
		var y1 = _topPositionForNodePos(this.yPos);
		var x2 = _leftPositionForNodePos(child.xPos);
		var y2 = _topPositionForNodePos(child.yPos);

		var existingLine = this.tree.svgDoc.getElementById(_lineId(this, child));
		if (existingLine) {
			$(existingLine).velocity({x1:x1, y1:y1, x2:x2, y2:y2});
		}
		else {
			var line = document.createElementNS(SVG_NS, "line");
			line.setAttributeNS(null, "x1", x1);
			line.setAttributeNS(null, "y1", y1);
			line.setAttributeNS(null, "x2", x2);
			line.setAttributeNS(null, "y2", y2);
			line.setAttributeNS(null, "class", "connector");
			line.setAttributeNS(null, "id", _lineId(this, child));
		
			// Make the line fade in.
			line.setAttributeNS(null, "opacity", 0);
			$(line).velocity({opacity:1}, {delay:300});

			this.tree.svgLines.appendChild(line);
		}
	};
	TreeNode.prototype._writeXml = function() {
		var result = "<node id=\"" + this.id +"\"";
		if (this.left) {
			result += " left=\"" + this.left.id +"\"";
		}
		if (this.right) {
			result += " right=\"" + this.right.id +"\"";
		}
		result += "/>";
		if (this.left) {
			result += this.left._writeXml();
		}
		if (this.right) {
			result += this.right._writeXml();
		}
		return result;	

	};

	///The Tree object so that we can keep track of trees, and not be so dependant on globals.
	function Tree(opts) {
		if (opts.Xml) {
			var allNodesArray = opts.Xml;
			var rootNodeId = opts.RootId;
		
			this.rootNode = new TreeNode({"XML": allNodesArray, "RootId": rootNodeId, "Tree": this});
			this.highestId = Math.max.apply(Math, allNodesArray.map(function(o) { return o.id;}));
		}
		else {
			this.rootNode = new TreeNode({"SingleId": 1});
			this.highestId = 1;
		}
	
		if (opts.SvgDoc) {
			this.setSvg(opts.SvgDoc);
		}
		{
			switch (opts.Positioning) {
				case AdHavocBinaryTree.ALGORITHM.LEFT_ALIGNED:
					this._setPositioningFunction(this._calculateTreePositionsWithLeftAligned);
					break;
				case AdHavocBinaryTree.ALGORITHM.BALANCED:
					this._setPositioningFunction(this._calculateTreePositionsWithBalancedParent);
					break;
				default:
					this._setPositioningFunction(this._calculateTreePositionsWithFullBalance);
					break;
			}			
			this.recalculatePositions();
			this.setViewBox();
			this.drawTree();
		}
	}
	Tree.prototype.setSvg = function(svgDoc) {
		if (svgDoc) {
			this.svgDoc = svgDoc;
			this.svgDoc.setAttributeNS(null, "class", "AdHavocBinaryTree");
			this.svgCircles = document.createElementNS('http://www.w3.org/2000/svg','g');
			this.svgCircles.setAttributeNS('http://www.w3.org/2000/svg','id','circleGroup');

			this.svgLines = document.createElementNS('http://www.w3.org/2000/svg','g');
			this.svgLines.setAttributeNS('http://www.w3.org/2000/svg','id','lineGroup');

			// Lines must come before circles so that they appear behind the circles.
			this.svgDoc.appendChild(this.svgLines);
			this.svgDoc.appendChild(this.svgCircles);
		}
	};
	Tree.prototype._setPositioningFunction = function(func) {
		if (func) {
			this.positioningFunc = func;
		}
	};
	Tree.prototype.recalculatePositions = function() {
		if (this.positioningFunc) {
			this.positioningFunc();
		}
	};
	Tree.prototype._calculateTreePositionsWithLeftAligned = function() {
		var positioningArray = [];

		this.rootNode._calculateTreeNodePositionsWithLeftAligned(positioningArray, 0);
	
		this.maxHeight = positioningArray.length;
		this.maxWidth = Math.max.apply(null, positioningArray) - 2; // The array stores the next available entry, so -2 to get the previous entry.
	};
	Tree.prototype._calculateTreePositionsWithBalancedParent = function() {
		var positioningArray = [];

		this.rootNode._calculateTreeNodePositionsWithBalancedParent(positioningArray, 0, 0);

		this.maxHeight = positioningArray.length;
		this.maxWidth = Math.max.apply(null, positioningArray) - 2; // The array stores the next available entry, so -2 to get the previous entry.
	};
	Tree.prototype._calculateTreePositionsWithFullBalance = function() {
		var positioningArray = [];
		this.rootNode._calculateTreeNodePositionsWithBalancedParent(positioningArray, 0, 0);

		this.maxHeight = positioningArray.length;
		this.maxWidth = Math.max.apply(null, positioningArray) - 2; // The array stores the next available entry, so -2 to get the previous entry.
	
		// Now we start trying to calculate how far we can move things to the right, but only left nodes.
		positioningArray = [];
		var arrayLen = this.maxHeight;
	
		while(arrayLen--) {positioningArray[arrayLen] = (this.maxWidth+2);}
	
		this.rootNode._shiftLeftNodesRight(positioningArray, 0);
	};

	Tree.prototype._getNextNodeId = function() {
		this.highestId++;
		return this.highestId;
	};
	Tree.prototype.svgHeight = function() {
		return ((this.maxHeight-1) * CIRCLE_DIST_Y) + 2 * (CIRCLE_RADIUS + SVG_TB_PADDING);
	};
	Tree.prototype.svgWidth = function() {
		return Math.ceil((this.maxWidth * CIRCLE_DIST_X) + 2 * (CIRCLE_RADIUS + SVG_LR_PADDING));
	};
	Tree.prototype.setViewBox = function() {
		this.svgDoc.setAttribute("viewBox", "0 0 " + this.svgWidth() + " " + this.svgHeight());
	};
	Tree.prototype.drawTree = function() {
		var origHeight = this.svgDoc.viewBox.animVal.height;
		var origWidth = this.svgDoc.viewBox.animVal.width;
	
		var docHeight = this.svgHeight();
		var docWidth = this.svgWidth();

		// If the dimensions have changed, then let's animate the new viewBox
		if ((origHeight !== docHeight) || (origWidth !== docWidth)) {
			var deltaHeight = docHeight - origHeight;
			var deltaWidth = docWidth - origWidth;

			$(this.svgDoc).velocity( 
			{ 
				tween: 1 
			},
			{ 
				progress: function(elements, complete, remaining, start, tweenValue) {
					var newWidth = origWidth + complete * deltaWidth;
					var newHeight = origHeight + complete * deltaHeight;
					elements[0].setAttribute('viewBox', '0 0 ' + newWidth + ' ' + newHeight); 
				}
			 });
		}	
		this.rootNode._drawTree();
	};


	// This function will output the xml to recreate the tree. Useful for debugging.
	Tree.prototype.WriteTree = function() {
		return "<root startNode=\"" + this.rootNode.id + "\">" + this.rootNode._writeXml() + "</root>";
	};


} ());
