/*****
 * Copyright (c) 2023 Radius Software
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
 * A text tree is a handly class whose purpose is to manage a tree with n-nodes
 * for each branch, in which the the branch key is a case-sensitive text string.
 * Each tree is constructed with a specified delimiter, which use for splitting
 * paths into segments of keys for branching.  If the delimiter is a forward
 * slash, it will literally accept POSIX-looking paths and search the tree for
 * that specific node or fail if not found.
*****/
register('', class TextTree {
    constructor(delimiter) {
        this.delimiter = delimiter;
        this.root = mkTextTreeNode();
        this.root.tree = this;
        this.root.value = null;
    }

    add(path, value) {
        let node = this.ensureNode(path);

        if (node.value === null) {
            node.value = value;
        }

        return this;
    }

    ensureNode(path) {
        let node;

        if (typeof path == 'string') {
            node = this.root;
            let keys = this.getKeys(path.trim(), this.delimiter);

            while (keys.length) {
                let key = keys.shift();

                if (key in node) {
                    node = node[key];
                }
                else {
                    let child = mkTextTreeNode(null);
                    node.add(key, child);
                    node = child;
                }
            }
        }

        return node;
    }

    get(path) {
        let node = this.root;

        if (typeof path == 'string') {
            for (let key of this.getKeys(path.trim(), this.delimiter)) {
                if (key in node) {
                    node = node.children[key];
                }
                else {
                    return null;
                }
            }
        }

        return node;
    }

    remove(path) {
        let node = this.getNode();

        if (node) {
            node.detach();
        }

        return this;
    }

    set(path, value) {
        let node = this.ensureNode(path);
        node.value = value;
        return this;
    }
});


/*****
 * Nodes are the nodes of the text tree.  Each node may have a single value
 * associated with it of any type.  Hence, a node value is allowed to be a complex
 * object, if necessary.  Nodes provide varioius utilities such as iteration
 * over children, getting, setting, or clearing values, and features for adding
 * and removing child nodes.
*****/
register('', class TextTreeNode {
    constructor(value) {
        this.value = value;
        this.tree = null;
        this.parent = null;
        this.key = null;
        this.children = {};
    }

    add(key, value) {
        if (this.tree) {
            if (!(key in this.children)) {
                let node = mkTextTreeNode(this, value);
                this.children[key] = node;
                node.tree = this.tree;
                node.parent = this;
                node.key = key;
            }
        }

        return this;
    }

    detach() {
        if (this.tree && this.parent) {
            delete this.parent.children[this.key];
            this.tree = null;
            this.parent = null;
            this.key = null;
        }

        return this;
    }

    getChildren() {
        return Object.values(this.children);
    }

    getKey() {
        return this.key;
    }

    getKeys() {
        return Object.keys(this.children);
    }

    getParent() {
        return this.parent;
    }

    getPath() {
        let path = [];

        if (this.tree) {
            let node = this;

            while (node && node.parent != null) {
                path.unshift(node.key);
                node = node.parent;
            }
        }

        return path;
    }

    getTree() {
        return this.tree;
    }

    getValue() {
        return this.value;
    }

    getValues() {
        return Object.values(this.children).map(v => v.value);
    }

    remove(key) {
        if (key in this.children) {
            this.children[key].detach();
        }

        return this;
    }

    removeChildren() {
        for (let key of Object.keys(this.children)) {
            this.children[key].detach();
        }

        return this;
    }

    set(key, value) {
        if (this.tree) {
            if (key in this.children) {
                this.children[key].value = value;
            }
            else {
                let node = mkTextTreeNode(this, value);
                this.children[key] = node;
                node.tree = this.tree;
                node.parent = this;
                node.key = key;
            }
        }
        
        return this;
    }

    [Symbol.iterator]() {
        return Object.values(this.children)[Symbol.iterator]();
    }
});
