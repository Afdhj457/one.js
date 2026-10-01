/**
 * one.js - 一个极简的 DOM 操作库
 * 版本: 2.0.0
 * 特点: 链式调用、轻量级、无依赖、性能优化
 */

(function (global) {
  'use strict';

  // ==================== 工具函数 ====================
  const isString = (v) => typeof v === 'string';
  const isFunction = (v) => typeof v === 'function';
  const isNode = (v) => v instanceof Node;
  const isArrayLike = (v) => v != null && typeof v === 'object' && typeof v.length === 'number' && !isFunction(v);
  const isPlainObject = (v) => v != null && typeof v === 'object' && (v.constructor === Object || v.constructor === undefined);

  // 缓存 document 引用，避免重复查找
  const doc = global.document;

  // 事件监听器存储（使用 WeakMap 避免内存泄漏）
  const eventStore = new WeakMap();

  // 预编译正则，避免重复创建
  const RE_HTML = /^\s*<[\s\S]*>\s*$/;
  const RE_WHITESPACE = /\s+/;

  // ==================== 核心构造函数 ====================
  function One(selector, context) {
    if (!(this instanceof One)) return new One(selector, context);

    this.elements = [];
    this.length = 0;

    if (selector == null) return this;

    // 函数：文档就绪
    if (isFunction(selector)) {
      One.ready(selector);
      return this;
    }

    // 字符串
    if (isString(selector)) {
      const trimmed = selector.trim();
      if (!trimmed) return this;

      // HTML 片段
      if (RE_HTML.test(trimmed)) {
        const temp = doc.createElement('div');
        temp.innerHTML = trimmed;
        this._setElements(temp.children);
        return this;
      }

      // CSS 选择器
      const ctx = context
        ? (context instanceof One ? context.elements[0] : (isNode(context) ? context : doc))
        : doc;
      if (!ctx) return this;
      this._setElements(ctx.querySelectorAll(trimmed));
      return this;
    }

    // One 实例
    if (selector instanceof One) {
      this._setElements(selector.elements);
      return this;
    }

    // 单个节点
    if (isNode(selector)) {
      this.elements = [selector];
      this.length = 1;
      return this;
    }

    // NodeList / HTMLCollection / 数组
    if (isArrayLike(selector)) {
      this._setElements(selector);
      return this;
    }

    return this;
  }

  // ==================== 原型方法 ====================
  const proto = One.prototype;

  // 内部：设置元素集合并更新 length
  proto._setElements = function (list) {
    this.elements = Array.prototype.slice.call(list);
    this.length = this.elements.length;
    return this;
  };

  // 遍历（带缓存的循环，比 forEach 快）
  proto.each = function (callback) {
    const els = this.elements;
    for (let i = 0, len = els.length; i < len; i++) {
      callback.call(els[i], i, els[i]);
    }
    return this;
  };

  // 获取元素
  proto.get = function (index) {
    if (index === undefined) return this.elements.slice();
    return this.elements[index < 0 ? this.elements.length + index : index] || null;
  };

  proto.first = function () {
    return this.elements[0] || null;
  };

  proto.last = function () {
    return this.elements[this.elements.length - 1] || null;
  };

  proto.eq = function (index) {
    const el = this.get(index);
    return el ? new One(el) : new One();
  };

  proto.toArray = function () {
    return this.elements.slice();
  };

  // ==================== 类名操作 ====================
  proto.addClass = function (className) {
    if (!className) return this;
    const classes = className.split(RE_WHITESPACE);
    return this.each(function () {
      const cl = this.classList;
      for (let i = 0, len = classes.length; i < len; i++) {
        if (classes[i]) cl.add(classes[i]);
      }
    });
  };

  proto.removeClass = function (className) {
    if (!className) {
      return this.each(function () {
        this.className = '';
      });
    }
    const classes = className.split(RE_WHITESPACE);
    return this.each(function () {
      const cl = this.classList;
      for (let i = 0, len = classes.length; i < len; i++) {
        if (classes[i]) cl.remove(classes[i]);
      }
    });
  };

  proto.toggleClass = function (className, force) {
    if (!className) return this;
    const classes = className.split(RE_WHITESPACE);
    return this.each(function () {
      const cl = this.classList;
      for (let i = 0, len = classes.length; i < len; i++) {
        if (classes[i]) cl.toggle(classes[i], force);
      }
    });
  };

  proto.hasClass = function (className) {
    if (!className) return false;
    const classes = className.split(RE_WHITESPACE);
    const els = this.elements;
    for (let i = 0, len = els.length; i < len; i++) {
      const cl = els[i].classList;
      let all = true;
      for (let j = 0, clen = classes.length; j < clen; j++) {
        if (classes[j] && !cl.contains(classes[j])) {
          all = false;
          break;
        }
      }
      if (all) return true;
    }
    return false;
  };

  // ==================== 属性操作 ====================
  proto.attr = function (name, value) {
    // 批量设置
    if (isPlainObject(name)) {
      const attrs = name;
      return this.each(function () {
        for (const key in attrs) {
          if (Object.prototype.hasOwnProperty.call(attrs, key)) {
            this.setAttribute(key, attrs[key]);
          }
        }
      });
    }
    // 获取
    if (value === undefined) {
      const el = this.elements[0];
      return el ? el.getAttribute(name) : undefined;
    }
    // 设置
    return this.each(function () {
      this.setAttribute(name, value);
    });
  };

  proto.removeAttr = function (name) {
    if (!name) return this;
    const names = name.split(RE_WHITESPACE);
    return this.each(function () {
      for (let i = 0, len = names.length; i < len; i++) {
        if (names[i]) this.removeAttribute(names[i]);
      }
    });
  };

  proto.prop = function (name, value) {
    if (value === undefined) {
      const el = this.elements[0];
      return el ? el[name] : undefined;
    }
    return this.each(function () {
      this[name] = value;
    });
  };

  // ==================== 样式操作 ====================
  proto.css = function (prop, value) {
    // 批量设置
    if (isPlainObject(prop)) {
      const styles = prop;
      return this.each(function () {
        const st = this.style;
        for (const key in styles) {
          if (Object.prototype.hasOwnProperty.call(styles, key)) {
            st[key] = styles[key];
          }
        }
      });
    }
    // 获取（计算样式）
    if (value === undefined) {
      const el = this.elements[0];
      if (!el) return undefined;
      const computed = global.getComputedStyle(el);
      return computed[prop] || el.style[prop];
    }
    // 设置
    return this.each(function () {
      this.style[prop] = value;
    });
  };

  // ==================== 内容操作 ====================
  proto.text = function (content) {
    if (content === undefined) {
      const els = this.elements;
      let result = '';
      for (let i = 0, len = els.length; i < len; i++) {
        result += els[i].textContent;
      }
      return result;
    }
    return this.each(function () {
      this.textContent = content;
    });
  };

  proto.html = function (content) {
    if (content === undefined) {
      const el = this.elements[0];
      return el ? el.innerHTML : undefined;
    }
    return this.each(function () {
      this.innerHTML = content;
    });
  };

  proto.val = function (value) {
    if (value === undefined) {
      const el = this.elements[0];
      return el ? el.value : undefined;
    }
    return this.each(function () {
      this.value = value;
    });
  };

  // ==================== 显示/隐藏 ====================
  proto.hide = function () {
    return this.each(function () {
      this.style.display = 'none';
    });
  };

  proto.show = function () {
    return this.each(function () {
      if (this.style.display === 'none') {
        this.style.display = '';
      }
    });
  };

  proto.toggle = function () {
    return this.each(function () {
      this.style.display = this.style.display === 'none' ? '' : 'none';
    });
  };

  // ==================== 插入操作 ====================
  // 解析内容为节点数组（缓存模板容器）
  let _tempContainer = null;
  function parseContent(content) {
    if (!content) return [];
    if (content instanceof One) return content.elements.slice();
    if (isNode(content)) return [content];
    if (isString(content)) {
      if (!_tempContainer) _tempContainer = doc.createElement('div');
      _tempContainer.innerHTML = content.trim();
      return Array.prototype.slice.call(_tempContainer.childNodes);
    }
    if (isArrayLike(content)) return Array.prototype.slice.call(content);
    return [];
  }

  proto._insert = function (content, method) {
    const nodes = parseContent(content);
    if (!nodes.length) return this;

    return this.each(function () {
      const target = this;
      for (let i = 0, len = nodes.length; i < len; i++) {
        // 多个目标时克隆节点，避免移动
        const node = len > 1 || this !== target ? nodes[i].cloneNode(true) : nodes[i];
        target[method](node);
      }
    });
  };

  proto.append = function (content) {
    return this._insert(content, 'appendChild');
  };

  proto.prepend = function (content) {
    return this._insert(content, 'insertBefore');
  };

  proto.before = function (content) {
    const nodes = parseContent(content);
    if (!nodes.length) return this;
    return this.each(function () {
      const parent = this.parentNode;
      if (!parent) return;
      for (let i = 0, len = nodes.length; i < len; i++) {
        parent.insertBefore(nodes[i].cloneNode(true), this);
      }
    });
  };

  proto.after = function (content) {
    const nodes = parseContent(content);
    if (!nodes.length) return this;
    return this.each(function () {
      const parent = this.parentNode;
      if (!parent) return;
      const next = this.nextSibling;
      for (let i = 0, len = nodes.length; i < len; i++) {
        parent.insertBefore(nodes[i].cloneNode(true), next);
      }
    });
  };

  proto.remove = function () {
    return this.each(function () {
      if (this.parentNode) this.parentNode.removeChild(this);
    });
  };

  proto.empty = function () {
    return this.each(function () {
      while (this.firstChild) this.removeChild(this.firstChild);
    });
  };

  // ==================== 事件操作 ====================
  proto.on = function (event, selector, handler) {
    if (isFunction(selector)) {
      handler = selector;
      selector = null;
    }
    if (!isFunction(handler)) return this;

    const events = event.split(RE_WHITESPACE);

    return this.each(function () {
      const element = this;

      // 获取或初始化该元素的事件存储
      let store = eventStore.get(element);
      if (!store) {
        store = {};
        eventStore.set(element, store);
      }

      for (let e = 0; e < events.length; e++) {
        const evtName = events[e];
        if (!evtName) continue;

        // 每个事件名对应一个统一的监听器
        if (!store[evtName]) {
          store[evtName] = { handlers: [], native: null };

          store[evtName].native = function (e) {
            const handlers = store[evtName].handlers;
            for (let i = 0; i < handlers.length; i++) {
              const item = handlers[i];
              if (item.selector) {
                const matched = e.target.closest(item.selector);
                if (matched && element.contains(matched)) {
                  item.handler.call(matched, e, matched);
                }
              } else {
                item.handler.call(element, e);
              }
            }
          };

          element.addEventListener(evtName, store[evtName].native, false);
        }

        store[evtName].handlers.push({ handler, selector });
      }
    });
  };

  proto.off = function (event, handler) {
    const events = event ? event.split(RE_WHITESPACE) : null;

    return this.each(function () {
      const element = this;
      const store = eventStore.get(element);
      if (!store) return;

      const evtNames = events || Object.keys(store);

      for (let i = 0; i < evtNames.length; i++) {
        const evtName = evtNames[i];
        const entry = store[evtName];
        if (!entry) continue;

        if (!handler) {
          // 移除该事件所有监听
          entry.handlers = [];
        } else {
          // 移除指定 handler
          entry.handlers = entry.handlers.filter(function (item) {
            return item.handler !== handler;
          });
        }

        // 没有 handler 了，移除原生监听
        if (entry.handlers.length === 0) {
          element.removeEventListener(evtName, entry.native, false);
          delete store[evtName];
        }
      }
    });
  };

  proto.once = function (event, handler) {
    const self = this;
    function wrapper(e) {
      handler.call(this, e);
      self.off(event, wrapper);
    }
    return this.on(event, wrapper);
  };

  proto.trigger = function (event, detail) {
    const evt = new CustomEvent(event, {
      bubbles: true,
      cancelable: true,
      detail: detail
    });
    return this.each(function () {
      this.dispatchEvent(evt);
    });
  };

  // ==================== 遍历/查找 ====================
  proto.find = function (selector) {
    const result = new One();
    const collected = [];
    const seen = new Set();

    for (let i = 0, len = this.elements.length; i < len; i++) {
      const found = this.elements[i].querySelectorAll(selector);
      for (let j = 0, flen = found.length; j < flen; j++) {
        if (!seen.has(found[j])) {
          seen.add(found[j]);
          collected.push(found[j]);
        }
      }
    }
    return result._setElements(collected);
  };

  proto.filter = function (callback) {
    const result = new One();
    return result._setElements(Array.prototype.filter.call(this.elements, callback));
  };

  proto.map = function (callback) {
    return Array.prototype.map.call(this.elements, callback);
  };

  proto.parent = function () {
    const result = new One();
    const collected = [];
    const seen = new Set();
    for (let i = 0, len = this.elements.length; i < len; i++) {
      const p = this.elements[i].parentNode;
      if (p && p.nodeType === 1 && !seen.has(p)) {
        seen.add(p);
        collected.push(p);
      }
    }
    return result._setElements(collected);
  };

  proto.children = function () {
    const result = new One();
    const collected = [];
    for (let i = 0, len = this.elements.length; i < len; i++) {
      const c = this.elements[i].children;
      for (let j = 0, clen = c.length; j < clen; j++) {
        collected.push(c[j]);
      }
    }
    return result._setElements(collected);
  };

  proto.next = function () {
    const result = new One();
    const collected = [];
    const seen = new Set();
    for (let i = 0, len = this.elements.length; i < len; i++) {
      const n = this.elements[i].nextElementSibling;
      if (n && !seen.has(n)) {
        seen.add(n);
        collected.push(n);
      }
    }
    return result._setElements(collected);
  };

  proto.prev = function () {
    const result = new One();
    const collected = [];
    const seen = new Set();
    for (let i = 0, len = this.elements.length; i < len; i++) {
      const p = this.elements[i].previousElementSibling;
      if (p && !seen.has(p)) {
        seen.add(p);
        collected.push(p);
      }
    }
    return result._setElements(collected);
  };

  proto.index = function (element) {
    if (element === undefined) {
      const first = this.elements[0];
      if (!first || !first.parentNode) return -1;
      return Array.prototype.indexOf.call(first.parentNode.children, first);
    }
    if (element instanceof One) element = element.elements[0];
    return this.elements.indexOf(element);
  };

  proto.is = function (selector) {
    for (let i = 0, len = this.elements.length; i < len; i++) {
      if (this.elements[i].matches(selector)) return true;
    }
    return false;
  };

  // ==================== 静态方法 ====================
  One.ready = function (callback) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', function handler() {
        doc.removeEventListener('DOMContentLoaded', handler);
        callback();
      });
    } else {
      callback();
    }
  };

  One.createElement = function (tagName, attrs, children) {
    const el = doc.createElement(tagName);
    if (attrs) {
      for (const key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
        const val = attrs[key];
        if (key === 'class' || key === 'className') {
          el.className = val;
        } else if (key === 'style' && isPlainObject(val)) {
          for (const p in val) {
            if (Object.prototype.hasOwnProperty.call(val, p)) el.style[p] = val[p];
          }
        } else if (key === 'dataset' && isPlainObject(val)) {
          for (const d in val) {
            if (Object.prototype.hasOwnProperty.call(val, d)) el.dataset[d] = val[d];
          }
        } else if (key.indexOf('on') === 0 && isFunction(val)) {
          el.addEventListener(key.slice(2).toLowerCase(), val);
        } else {
          el.setAttribute(key, val);
        }
      }
    }
    if (children) {
      const nodes = parseContent(children);
      for (let i = 0, len = nodes.length; i < len; i++) {
        el.appendChild(nodes[i]);
      }
    }
    return new One(el);
  };

  // 轻量 AJAX（带超时、Promise 支持）
  One.ajax = function (options) {
    const opts = options || {};
    const method = (opts.method || 'GET').toUpperCase();
    const async = opts.async !== false;

    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      let url = opts.url;

      xhr.open(method, url, async);

      if (opts.timeout) xhr.timeout = opts.timeout;

      // 设置请求头
      if (opts.headers) {
        for (const key in opts.headers) {
          if (Object.prototype.hasOwnProperty.call(opts.headers, key)) {
            xhr.setRequestHeader(key, opts.headers[key]);
          }
        }
      }

      // 处理 GET 参数
      let data = opts.data;
      if (data && method === 'GET') {
        const params = [];
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
          }
        }
        if (params.length) {
          url += (url.indexOf('?') === -1 ? '?' : '&') + params.join('&');
        }
        data = null;
      } else if (data && isPlainObject(data)) {
        data = JSON.stringify(data);
        xhr.setRequestHeader('Content-Type', 'application/json');
      }

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          let response = xhr.responseText;
          if (opts.dataType === 'json') {
            try {
              response = JSON.parse(response);
            } catch (e) {
              reject(new Error('JSON parse error'));
              return;
            }
          }
          resolve(response);
        } else {
          reject(new Error('HTTP ' + xhr.status + ': ' + xhr.statusText));
        }
      };

      xhr.onerror = function () {
        reject(new Error('Network error'));
      };

      xhr.ontimeout = function () {
        reject(new Error('Request timeout'));
      };

      xhr.send(data || null);
    });
  };

  // ==================== 全局暴露 ====================
  function $(selector, context) {
    return new One(selector, context);
  }

  $.One = One;
  $.ready = One.ready;
  $.createElement = One.createElement;
  $.ajax = One.ajax;

  global.one = global.$ = $;

})(typeof window !== 'undefined' ? window : this);