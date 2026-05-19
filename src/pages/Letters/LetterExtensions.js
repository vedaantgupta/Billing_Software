import { Extension, Node, mergeAttributes } from '@tiptap/core';

// Custom Font Size Extension
export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .run();
      },
    };
  },
});

// Custom Line Height Extension
export const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight,
            renderHTML: attributes => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight: lineHeight => ({ commands }) => {
        return this.options.types.every(type => commands.updateAttributes(type, { lineHeight }));
      },
      unsetLineHeight: () => ({ commands }) => {
        return this.options.types.every(type => commands.resetAttributes(type, 'lineHeight'));
      },
    };
  },
});

// Custom Page Break Node Extension
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  parseHTML() {
    return [
      { tag: 'div.page-break' },
      { style: 'page-break-after' }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'page-break', style: 'page-break-after: always; break-after: page;' })];
  },

  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => {
        return chain()
          .insertContent({ type: this.name })
          .run();
      },
    };
  },
});

// Import Prosemirror utilities for decorations
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const searchPluginKey = new PluginKey('searchAndReplace');

// Custom Search and Replace Extension
export const SearchAndReplace = Extension.create({
  name: 'searchAndReplace',

  addOptions() {
    return {
      searchResultClass: 'search-result',
      searchResultActiveClass: 'search-result-active',
    };
  },

  addCommands() {
    return {
      setSearchTerm: (term) => ({ editor }) => {
        const { state, view } = editor;
        const tr = state.tr.setMeta('searchTerm', term);
        view.dispatch(tr);
        return true;
      },
      setSearchActiveIndex: (index) => ({ editor }) => {
        const { state, view } = editor;
        const tr = state.tr.setMeta('searchActiveIndex', index);
        view.dispatch(tr);
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return {
              searchTerm: '',
              activeIndex: 0,
              decorations: DecorationSet.empty,
            };
          },
          apply(tr, value, oldState, newState) {
            const termMeta = tr.getMeta('searchTerm');
            const indexMeta = tr.getMeta('searchActiveIndex');
            
            let searchTerm = value.searchTerm;
            let activeIndex = value.activeIndex;
            let decorations = value.decorations;

            if (termMeta !== undefined) {
              searchTerm = termMeta;
              activeIndex = 0; // Reset active index on search term change
            }
            if (indexMeta !== undefined) {
              activeIndex = indexMeta;
            }

            if (tr.docChanged) {
              decorations = decorations.map(tr.mapping, tr.doc);
            }

            if (termMeta !== undefined || indexMeta !== undefined || tr.docChanged) {
              if (!searchTerm || searchTerm.length < 1) {
                decorations = DecorationSet.empty;
                activeIndex = 0;
              } else {
                const decos = [];
                let matchIdx = 0;
                newState.doc.descendants((node, pos) => {
                  if (node.isText) {
                    const text = node.text;
                    let index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
                    while (index !== -1) {
                      const start = pos + index;
                      const end = start + searchTerm.length;
                      
                      const isCurrent = matchIdx === activeIndex;
                      decos.push(
                        Decoration.inline(start, end, {
                          class: isCurrent ? extension.options.searchResultActiveClass : extension.options.searchResultClass,
                        })
                      );
                      matchIdx++;
                      index = text.toLowerCase().indexOf(searchTerm.toLowerCase(), index + searchTerm.length);
                    }
                  }
                });
                decorations = DecorationSet.create(newState.doc, decos);
              }
            }

            return { searchTerm, activeIndex, decorations };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state).decorations;
          },
        },
      }),
    ];
  },
});
