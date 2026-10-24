// Oxlint JS plugin: user-facing text must come from Paraglide (m.key()), not literals.
const LETTER = /\p{L}/u;
const PROPS = new Set([
  "aria-label",
  "title",
  "placeholder",
  "alt",
  "label",
  "description",
]);
const TOAST = /^toast(?:\.\w+)?$/u;

const calleeName = (node) => {
  if (node.type === "Identifier") {
    return node.name;
  }
  if (node.type === "MemberExpression" && !node.computed) {
    const object = calleeName(node.object);
    return object ? `${object}.${node.property.name}` : null;
  }
  return null;
};

const literalText = (node) => {
  if (!node) {
    return null;
  }
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "TemplateLiteral") {
    return node.quasis.map((q) => q.value.cooked ?? "").join("");
  }
  if (node.type === "JSXExpressionContainer") {
    return literalText(node.expression);
  }
  return null;
};

const jsxText = {
  meta: { type: "problem" },
  create(context) {
    return {
      JSXText(node) {
        if (LETTER.test(node.value)) {
          context.report({
            message:
              "Untranslated text in JSX. Move it to messages/en.json and render m.key() from #/paraglide/messages.js.",
            node,
          });
        }
      },
    };
  },
};

const props = {
  meta: { type: "problem" },
  create(context) {
    return {
      CallExpression(node) {
        const name = calleeName(node.callee);
        if (!(name && TOAST.test(name))) {
          return;
        }
        for (const arg of node.arguments) {
          const text = literalText(arg);
          if (text && LETTER.test(text)) {
            context.report({
              message:
                "Untranslated toast message. Use m.key() from #/paraglide/messages.js.",
              node: arg,
            });
          }
        }
      },
      JSXAttribute(node) {
        const name = node.name.type === "JSXIdentifier" ? node.name.name : "";
        const text = literalText(node.value);
        if (PROPS.has(name) && text && LETTER.test(text)) {
          context.report({
            message:
              "Untranslated text in a user-facing prop. Use m.key() from #/paraglide/messages.js.",
            node,
          });
        }
      },
    };
  },
};

export default {
  meta: { name: "i18n" },
  rules: { "jsx-text": jsxText, props },
};
