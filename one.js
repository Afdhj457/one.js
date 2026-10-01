/**
 * one.js - 一个极简的 DOM 操作库
 * 版本: 1.0.0
 * 特点: 链式调用、轻量级、无依赖
 */

(function (global) {
  'use strict';

  // 核心构造函数
  function One(selector, context) {
    // 如果直接调用 One()，返回一个空实例
    if (!(this instanceof One)) {
      return new One(selector, context);
    }

    // 存储匹配到的元素
    this.elements = [];

    // 处理不同参数类型
    if (selector) {
      if (typeof selector === 'string') {
        // 字符串选择器：支持 CSS 选择器和 HTML 片段
        const trimmed = selector.trim();
        if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
          // HTML 片段：创建元素
          const temp = document.createElement('div');
          temp.innerHTML = trimmed;
          this.elements = Array.from(temp.children);
        } else {
          // CSS 选择器
          const ctx = context ? (context.elements ? context.elements[0] : context) : document;
          this.elements = Array.from(ctx.querySelectorAll(trimmed));
        }
      } else if (selector instanceof One) {
        // 传入 One 实例：复制元素
        this.elements = selector.elements.slice();
      } else if (selector instanceof Node) {
        // 单个 DOM 节点
        this.elements = [selector];
      } else if (selector instanceof NodeList || Array.isArray(selector)) {
        // NodeList 或数组
        this.elements = Array.from(selector);
      } else if (typeof selector === 'function') {
        // 文档就绪回调
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', selector);
        } else {
          selector();
        }
        this.elements = [];
      }
    }
  }

  // 原型方法
  One.prototype = {
    constructor: One,

    // 获取指定索引的元素
    get: function (index) {
      if (index === undefined) {
        return this.elements;
      }
      return this.elements[index] || null;
    },

    // 获取第一个元素（原生 DOM）
    first: function () {
      return this.elements[0] || null;
    },

    // 获取最后一个元素（原生 DOM）
    last: function () {
      return this.elements[this.elements.length - 1] || null;
    },

    // 遍历元素
    each: function (callback) {
      this.elements.forEach(function (el, i) {
        callback.call(el, i, el);
      });
      return this;
    },

    // 添加类名
    addClass: function (className) {
      if (!className) return this;
      const classes = className.split(/\s+/);
      return this.each(function () {
        classes.forEach(function (cls) {
          if (cls) this.classList.add(cls);
        }, this);
      });
    },

    // 移除类名
    removeClass: function (className) {
      if (!className) {
        // 不传参数时移除所有类名
        return this.each(function () {
          this.className = '';
        });
      }
      const classes = className.split(/\s+/);
      return this.each(function () {
        classes.forEach(function (cls) {
          if (cls) this.classList.remove(cls);
        }, this);
      });
    },

    // 切换类名
    toggleClass: function (className) {
      if (!className) return this;
      const classes = className.split(/\s+/);
      return this.each(function () {
        classes.forEach(function (cls) {
          if (cls) this.classList.toggle(cls);
        }, this);
      });
    },

    // 判断是否包含某个类名
    hasClass: function (className) {
      if (!className) return false;
      const classes = className.split(/\s+/);
      return this.elements.some(function (el) {
        return classes.every(function (cls) {
          return el.classList.contains(cls);
        });
      });
    },

    // 设置或获取属性
    attr: function (name, value) {
      if (typeof name === 'object') {
        // 批量设置属性
        const attrs = name;
        return this.each(function () {
          for (const key in attrs) {
            if (attrs.hasOwnProperty(key)) {
              this.setAttribute(key, attrs[key]);
            }
          }
        });
      }
      if (value === undefined) {
        // 获取属性
        return this.elements[0] ? this.elements[0].getAttribute(name) : undefined;
      }
      // 设置属性
      return this.each(function () {
        this.setAttribute(name, value);
      });
    },

    // 移除属性
    removeAttr: function (name) {
      return this.each(function () {
        this.removeAttribute(name);
      });
    },

    // 设置或获取样式
    css: function (prop, value) {
      if (typeof prop === 'object') {
        // 批量设置样式
        const styles = prop;
        return this.each(function () {
          for (const key in styles) {
            if (styles.hasOwnProperty(key)) {
              this.style[key] = styles[key];
            }
          }
        });
      }
      if (value === undefined) {
        // 获取样式（计算后的样式）
        if (!this.elements[0]) return undefined;
        const computed = window.getComputedStyle(this.elements[0]);
        return computed[prop] || this.elements[0].style[prop];
      }
      // 设置单个样式
      return this.each(function () {
        this.style[prop] = value;
      });
    },

    // 设置或获取文本内容
    text: function (content) {
      if (content === undefined) {
        return this.elements.map(function (el) {
          return el.textContent;
        }).join('');
      }
      return this.each(function () {
        this.textContent = content;
      });
    },

    // 设置或获取 HTML 内容
    html: function (content) {
      if (content === undefined) {
        return this.elements[0] ? this.elements[0].innerHTML : undefined;
      }
      return this.each(function () {
        this.innerHTML = content;
      });
    },

    // 设置或获取表单值
    val: function (value) {
      if (value === undefined) {
        return this.elements[0] ? this.elements[0].value : undefined;
      }
      return this.each(function () {
        this.value = value;
      });
    },

    // 隐藏元素
    hide: function () {
      return this.each(function () {
        this.style.display = 'none';
      });
    },

    // 显示元素（恢复默认显示方式）
    show: function () {
      return this.each(function () {
        if (this.style.display === 'none') {
          this.style.display = '';
        }
      });
    },

    // 在内部末尾追加内容
    append: function (content) {
      return this._insertContent(content, 'beforeend');
    },

    // 在内部开头插入内容
    prepend: function (content) {
      return this._insertContent(content, 'afterbegin');
    },

    // 在外部之前插入内容
    before: function (content) {
      return this._insertContent(content, 'beforebegin');
    },

    // 在外部之后插入内容
    after: function (content) {
      return this._insertContent(content, 'afterend');
    },

    // 内部辅助方法：插入内容
    _insertContent: function (content, position) {
      const self = this;
      const nodes = self._parseContent(content);
      if (nodes.length === 0) return this;

      return this.each(function () {
        const target = this;
        nodes.forEach(function (node) {
          const clone = node.cloneNode(true);
          target.insertAdjacentElement(position, clone);
        });
      });
    },

    // 解析内容为节点数组
    _parseContent: function (content) {
      if (!content) return [];
      if (content instanceof One) {
        return content.elements;
      }
      if (content instanceof Node) {
        return [content];
      }
      if (typeof content === 'string') {
        const temp = document.createElement('div');
        temp.innerHTML = content.trim();
        return Array.from(temp.childNodes);
      }
      if (Array.isArray(content) || content instanceof NodeList) {
        return Array.from(content);
      }
      return [];
    },

    // 移除元素
    remove: function () {
      return this.each(function () {
        if (this.parentNode) {
          this.parentNode.removeChild(this);
        }
      });
    },

    // 清空元素内容
    empty: function () {
      return this.each(function () {
        this.innerHTML = '';
      });
    },

    // 绑定事件
    on: function (event, selector, handler) {
      // 处理参数：on(event, handler) 或 on(event, selector, handler)
      if (typeof selector === 'function') {
        handler = selector;
        selector = null;
      }

      return this.each(function () {
        const element = this;
        const listener = function (e) {
          if (selector) {
            // 事件委托
            const target = e.target.closest(selector);
            if (target && element.contains(target)) {
              handler.call(target, e);
            }
          } else {
            handler.call(element, e);
          }
        };
        element.addEventListener(event, listener);

        // 存储监听器以便解绑
        if (!element._oneEvents) {
          element._oneEvents = {};
        }
        if (!element._oneEvents[event]) {
          element._oneEvents[event] = [];
        }
        element._oneEvents[event].push({ listener: listener, handler: handler, selector: selector });
      });
    },

    // 解绑事件
    off: function (event, handler) {
      return this.each(function () {
        if (!this._oneEvents || !this._oneEvents[event]) return;

        this._oneEvents[event] = this._oneEvents[event].filter(function (item) {
          if (handler && item.handler !== handler) {
            return true;
          }
          this.removeEventListener(event, item.listener);
          return false;
        }, this);
      });
    },

    // 触发事件
    trigger: function (event) {
      return this.each(function () {
        const evt = new CustomEvent(event, { bubbles: true, cancelable: true });
        this.dispatchEvent(evt);
      });
    },

    // 查找后代元素
    find: function (selector) {
      const result = new One();
      result.elements = [];
      this.each(function () {
        const found = this.querySelectorAll(selector);
        result.elements = result.elements.concat(Array.from(found));
      });
      return result;
    },

    // 获取父元素
    parent: function () {
      const result = new One();
      result.elements = [];
      this.each(function () {
        if (this.parentNode && result.elements.indexOf(this.parentNode) === -1) {
          result.elements.push(this.parentNode);
        }
      });
      return result;
    },

    // 获取子元素
    children: function () {
      const result = new One();
      result.elements = [];
      this.each(function () {
        const children = Array.from(this.children);
        result.elements = result.elements.concat(children);
      });
      return result;
    },

    // 获取下一个兄弟元素
    next: function () {
      const result = new One();
      result.elements = [];
      this.each(function () {
        let next = this.nextElementSibling;
        if (next && result.elements.indexOf(next) === -1) {
          result.elements.push(next);
        }
      });
      return result;
    },

    // 获取上一个兄弟元素
    prev: function () {
      const result = new One();
      result.elements = [];
      this.each(function () {
        let prev = this.previousElementSibling;
        if (prev && result.elements.indexOf(prev) === -1) {
          result.elements.push(prev);
        }
      });
      return result;
    },

    // 筛选元素
    filter: function (callback) {
      const result = new One();
      result.elements = this.elements.filter(function (el, i) {
        return callback.call(el, i, el);
      });
      return result;
    },

    // 映射元素
    map: function (callback) {
      return this.elements.map(function (el, i) {
        return callback.call(el, i, el);
      });
    },

    // 获取元素在集合中的索引
    index: function (element) {
      if (element === undefined) {
        // 返回第一个元素在其父元素中的索引
        const first = this.elements[0];
        if (!first) return -1;
        const parent = first.parentNode;
        if (!parent) return -1;
        return Array.from(parent.children).indexOf(first);
      }
      if (element instanceof One) {
        element = element.elements[0];
      }
      return this.elements.indexOf(element);
    },

    // 获取元素数量
    length: 0, // 在构造函数中动态更新

    // 转换为数组
    toArray: function () {
      return this.elements.slice();
    }
  };

  // 动态更新 length 属性
  Object.defineProperty(One.prototype, 'length', {
    get: function () {
      return this.elements.length;
    },
    configurable: true
  });

  // 静态方法：文档就绪
  One.ready = function (callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  };

  // 静态方法：创建元素
  One.createElement = function (tagName, attrs) {
    const el = document.createElement(tagName);
    if (attrs) {
      for (const key in attrs) {
        if (attrs.hasOwnProperty(key)) {
          if (key === 'class') {
            el.className = attrs[key];
          } else if (key === 'style' && typeof attrs[key] === 'object') {
            for (const prop in attrs[key]) {
              el.style[prop] = attrs[key][prop];
            }
          } else {
            el.setAttribute(key, attrs[key]);
          }
        }
      }
    }
    return new One(el);
  };

  // 静态方法：发送 AJAX 请求（简单封装）
  One.ajax = function (options) {
    const xhr = new XMLHttpRequest();
    const method = (options.method || 'GET').toUpperCase();
    const url = options.url;
    const async = options.async !== false;

    xhr.open(method, url, async);

    if (options.headers) {
      for (const key in options.headers) {
        if (options.headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, options.headers[key]);
        }
      }
    }

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        let response = xhr.responseText;
        if (options.dataType === 'json') {
          try {
            response = JSON.parse(response);
          } catch (e) {
            if (options.error) options.error(xhr, 'parsererror', e);
            return;
          }
        }
        if (options.success) options.success(response, xhr);
      } else {
        if (options.error) options.error(xhr, xhr.statusText, xhr);
      }
      if (options.complete) options.complete(xhr);
    };

    xhr.onerror = function () {
      if (options.error) options.error(xhr, 'error', xhr);
      if (options.complete) options.complete(xhr);
    };

    let data = options.data;
    if (data && method === 'GET') {
      const params = [];
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
        }
      }
      if (params.length) {
        url += (url.indexOf('?') === -1 ? '?' : '&') + params.join('&');
      }
      data = null;
    } else if (data && typeof data === 'object' && !(data instanceof FormData)) {
      data = JSON.stringify(data);
      xhr.setRequestHeader('Content-Type', 'application/json');
    }

    xhr.send(data || null);
    return xhr;
  };

  // 暴露到全局
  global.one = global.$ = function (selector, context) {
    return new One(selector, context);
  };

  // 挂载静态方法
  global.one.ready = One.ready;
  global.one.createElement = One.createElement;
  global.one.ajax = One.ajax;
  global.one.One = One;

})(typeof window !== 'undefined' ? window : this);