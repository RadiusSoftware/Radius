/*****
 * Copyright (c) 2024 Radius Software
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
*****/


/*****
 * A node tree is the trunk of beginning of a one-to-many tree of unsorted nodes
 * with the topology of a tree.  Nodes are added/removed using a coordinate
 * system call "path", which pretty much has the syntax of a simplified file dir
 * system.  The path is used for managing complex structures of values.  The
 * provided feature set is split across two classes: NodeTree and TreeNode.
*****/
register('', class NodeTree {
    constructor() {
        super();
        this.root = mkTreeNode(this);
    }

    clearNode(path) {
        let node = this.getNode(path);
        
        if (node) {
            node.clear();
        }

        return this;
    }

    clearValue(path) {
        let node = this.getNode(path);
        
        if (node) {
            node.clearValue();
        }

        return this;
    }

    enumerateNodes() {
        return this.root.enumerateNodes();
    }

    enumerateValues() {
        return this.root.enumerateValues();
    }

    ensureNode(path) {
        let node = this.root;

        for (let key of TextUtils.split(path, '/')) {
            key = key.trim();

            if (key in node.children) {
                node = node.children[key];
            }
            else {
                let childNode = mkTreeNode(node.tree);
                childNode.parent = this;
                childNode.parentKey = key;
                node.children[key] = childNode;
                node = childNode;
            }
        }

        return node;
    }

    getNode(path) {
        let node = this.root;

        for (let key of TextUtils.split(path, '/')) {
            if (!(key in node.children)) {
                return null;
            }
            else {
                node = node.children[key];
            }
        }

        return node;
    }

    getRoot() {
        return this.root;
    }

    getValue(path) {
        let node = this.getNode(path);
        return node ? node.getValue() : null;
    }

    hasNode(path) {
        let node = this.root;

        for (let key of TextUtils.split(path, '/')) {
            if (key in node) {
                node = node[key];
            }
            else {
                return false
            }
        }

        return true;
    }

    hasValue(path) {
        let node = this.root;

        for (let key of TextUtils.split(path, '/')) {
            if (key in node) {
                node = node[key];
            }
            else {
                return false
            }
        }

        return node.value !== null;
    }

    setValue(path, value) {
        let node = this.ensureNode(path);
        node.setValue(value);
        return this;
    }
});


/*****
 * A node is a single branch or leaf within the topology of a NodeTree, which is
 * a tree-like structure of nodes whose purpose is to organize a complex set of
 * values into a managable structure.  This could be used for a filesysstem, but
 * wouldn't be since the filesystem already provides these features.  One of the
 * first uses for a NodeTree / TreeNode was to support complex settings trees.
*****/
register('', class TreeNode {
    constructor(tree) {
        this.tree = tree;
        this.value = null;
        this.parent = null;
        this.parentKey = '';
        this.children = {};
    }

    clear() {
        if (this.parent) {
            delete this.parent.children[this.parentKey];
            this.parent = null;
        }

        return this;
    }

    clearChild(key) {
        if (key in this.children) {
            this.children[key].clear();
        }

        return this;
    }

    clearValue() {
        this.value = null;
        return this;
    }

    enumerateNodes() {
        let nodes = [];
        let stack = [ this ];

        while (stack.length) {
            let node = stack.pop();
            nodes.push(node);

            for (let child of node) {
                stack.unshift(child);
            }
        }

        return nodes;
    }

    enumerateValues() {
        let values = [];
        let stack = [ this ];

        while (stack.length) {
            let node = stack.pop();
            values.push({ path: node.getPath(), value: node.value });

            for (let child of node) {
                stack.unshift(child);
            }
        }

        return values;
    }

    getChildren() {
        return Object.values(this.children);
    }

    getKeys() {
        return Object.keys(this.children);
    }

    getValue() {
        return this.value;
    }

    getParent() {
        return this.parent;
    }

    hasParent() {
        return this.parent != null;
    }

    getPath() {
        let path = [];
        let node = this;

        while (node) {
            node.parentKey ? path.unshift(node.parentKey) : null;
            node = node.parent;
        }

        return `/${path.join('/')}`;
    }

    getTree() {
        return this.tree;
    }

    hasValue() {
        return this.value !== null;
    }

    setValue(value) {
        this.value = value;
        return this;
    }

    [Symbol.iterator]() {
        return Object.values(this.children)[Symbol.iterator]();
    }
});