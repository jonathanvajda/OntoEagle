`Normalization utils (toCamelCase, toPascalCase, normalizeStringToSnakeCase, etc.; getting datetime, appending datetime to filename)`

Nominated functions

```js
function getCurrentDateParts(date) {
    const now = date instanceof Date ? date : new Date();
    return {
      year: now.getFullYear(),
      month: String(now.getMonth() + 1).padStart(2, "0"),
      day: String(now.getDate()).padStart(2, "0"),
    };
  }


function splitStringToWords(str) {
  return String(str || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeStringToFlatCase(str) {
  return splitStringToWords(str).join("").toLowerCase();
}

function normalizeStringToUpperFlatCase(str) {
  return splitStringToWords(str).join("").toUpperCase();
}

function normalizeStringToTrainCase(str) {
  return splitStringToWords(str)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("-");
}

function normalizeStringToCobolCase(str) {
  return splitStringToWords(str).join("-").toUpperCase();
}

function normalizeStringToCamelCase(str) {
  const words = splitStringToWords(str);
  if (words.length === 0) return "";
  return (
    words[0].toLowerCase() +
    words
      .slice(1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("")
  );
}

function normalizeStringToPascalCase(str) {
  return splitStringToWords(str)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function normalizeStringToSnakeCase(str) {
  return splitStringToWords(str).join("_").toLowerCase();
}

function normalizeStringToShoutingSnakeCase(str) {
  return splitStringToWords(str).join("_").toUpperCase();
}


function normalizeStringToKebabCase(str) {
    return String(str || "")
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
}

function isValidOntology(content) {
    return classifyOntologyInput({ text: content }).isOntologyCandidate;
    }
```

```jest
describe("splitStringToWords", () => {
  test("handles basic word combinations with various casing", () => {
    expect(splitStringToWords("Moot")).toEqual(["Moot"]);
    expect(splitStringToWords("moot")).toEqual(["moot"]);
    expect(splitStringToWords("Foo Bar")).toEqual(["Foo", "Bar"]);
    expect(splitStringToWords("Foo bar")).toEqual(["Foo", "bar"]);
    expect(splitStringToWords("foo Bar")).toEqual(["foo", "Bar"]);
    expect(splitStringToWords("foo bar")).toEqual(["foo", "bar"]);
    expect(splitStringToWords("Bingo Bango Bongo")).toEqual(["Bingo", "Bango", "Bongo"]);
    expect(splitStringToWords("Bingo Bango bongo")).toEqual(["Bingo", "Bango", "bongo"]);
    expect(splitStringToWords("Bingo bango Bongo")).toEqual(["Bingo", "bango", "Bongo"]);
    expect(splitStringToWords("Bingo bango bongo")).toEqual(["Bingo", "bango", "bongo"]);
    expect(splitStringToWords("bingo Bango Bongo")).toEqual(["bingo", "Bango", "Bongo"]);
    expect(splitStringToWords("bingo Bango bongo")).toEqual(["bingo", "Bango", "bongo"]);
    expect(splitStringToWords("bingo bango Bongo")).toEqual(["bingo", "bango", "Bongo"]);
    expect(splitStringToWords("bingo bango bongo")).toEqual(["bingo", "bango", "bongo"]);
  });

  test("splits camelCase and PascalCase boundaries", () => {
    expect(splitStringToWords("fooBar")).toEqual(["foo", "Bar"]);
    expect(splitStringToWords("FooBarBaz")).toEqual(["Foo", "Bar", "Baz"]);
    expect(splitStringToWords("helloWorldAgain")).toEqual(["hello", "World", "Again"]);
  });

  test("handles consecutive uppercase letters and acronyms", () => {
    expect(splitStringToWords("HTTPRequest")).toEqual(["HTTP", "Request"]);
    expect(splitStringToWords("XMLHttpRequest")).toEqual(["XML", "Http", "Request"]);
    expect(splitStringToWords("JSONParser")).toEqual(["JSON", "Parser"]);
    expect(splitStringToWords("IOError")).toEqual(["IO", "Error"]);
  });

  test("handles numbers inline with words", () => {
    expect(splitStringToWords("version2Point0")).toEqual(["version2", "Point0"]);
    expect(splitStringToWords("foo123Bar")).toEqual(["foo123", "Bar"]);
    expect(splitStringToWords("123fooBar")).toEqual(["123foo", "Bar"]);
  });

  test("strips symbols, punctuation, and extra whitespace", () => {
    expect(splitStringToWords("  foo--bar__baz  ")).toEqual(["foo", "bar", "baz"]);
    expect(splitStringToWords("foo, bar & baz!")).toEqual(["foo", "bar", "baz"]);
    expect(splitStringToWords("user@domain.com")).toEqual(["user", "domain", "com"]);
    expect(splitStringToWords("path/to/file.js")).toEqual(["path", "to", "file", "js"]);
  });

  test("handles empty, null, undefined, or whitespace-only inputs", () => {
    expect(splitStringToWords("")).toEqual([]);
    expect(splitStringToWords("   ")).toEqual([]);
    expect(splitStringToWords(null)).toEqual([]);
    expect(splitStringToWords(undefined)).toEqual([]);
  });
});

describe("Case Conversions", () => {
  test("case conversion for Flat Case (flatcase)", () => {
    expect(normalizeStringToFlatCase("Moot")).toBe("moot");
    expect(normalizeStringToFlatCase("moot")).toBe("moot");
    expect(normalizeStringToFlatCase("Foo Bar")).toBe("foobar");
    expect(normalizeStringToFlatCase("Foo bar")).toBe("foobar");
    expect(normalizeStringToFlatCase("foo Bar")).toBe("foobar");
    expect(normalizeStringToFlatCase("foo bar")).toBe("foobar");
    expect(normalizeStringToFlatCase("Bingo Bango Bongo")).toBe("bingobangobongo");
    expect(normalizeStringToFlatCase("Bingo Bango bongo")).toBe("bingobangobongo");
    expect(normalizeStringToFlatCase("Bingo bango Bongo")).toBe("bingobangobongo");
    expect(normalizeStringToFlatCase("Bingo bango bongo")).toBe("bingobangobongo");
    expect(normalizeStringToFlatCase("bingo Bango Bongo")).toBe("bingobangobongo");
    expect(normalizeStringToFlatCase("bingo Bango bongo")).toBe("bingobangobongo");
    expect(normalizeStringToFlatCase("bingo bango Bongo")).toBe("bingobangobongo");
    expect(normalizeStringToFlatCase("bingo bango bongo")).toBe("bingobangobongo");
  });

  test("case conversion for Upper Flat Case (UPPERFLATCASE)", () => {
    expect(normalizeStringToUpperFlatCase("Moot")).toBe("MOOT");
    expect(normalizeStringToUpperFlatCase("moot")).toBe("MOOT");
    expect(normalizeStringToUpperFlatCase("Foo Bar")).toBe("FOOBAR");
    expect(normalizeStringToUpperFlatCase("Foo bar")).toBe("FOOBAR");
    expect(normalizeStringToUpperFlatCase("foo Bar")).toBe("FOOBAR");
    expect(normalizeStringToUpperFlatCase("foo bar")).toBe("FOOBAR");
    expect(normalizeStringToUpperFlatCase("Bingo Bango Bongo")).toBe("BINGOBANGOBONGO");
    expect(normalizeStringToUpperFlatCase("Bingo Bango bongo")).toBe("BINGOBANGOBONGO");
    expect(normalizeStringToUpperFlatCase("Bingo bango Bongo")).toBe("BINGOBANGOBONGO");
    expect(normalizeStringToUpperFlatCase("Bingo bango bongo")).toBe("BINGOBANGOBONGO");
    expect(normalizeStringToUpperFlatCase("bingo Bango Bongo")).toBe("BINGOBANGOBONGO");
    expect(normalizeStringToUpperFlatCase("bingo Bango bongo")).toBe("BINGOBANGOBONGO");
    expect(normalizeStringToUpperFlatCase("bingo bango Bongo")).toBe("BINGOBANGOBONGO");
    expect(normalizeStringToUpperFlatCase("bingo bango bongo")).toBe("BINGOBANGOBONGO");
  });

  test("case conversion for Train Case (Train-Case)", () => {
    expect(normalizeStringToTrainCase("Moot")).toBe("Moot");
    expect(normalizeStringToTrainCase("moot")).toBe("Moot");
    expect(normalizeStringToTrainCase("Foo Bar")).toBe("Foo-Bar");
    expect(normalizeStringToTrainCase("Foo bar")).toBe("Foo-Bar");
    expect(normalizeStringToTrainCase("foo Bar")).toBe("Foo-Bar");
    expect(normalizeStringToTrainCase("foo bar")).toBe("Foo-Bar");
    expect(normalizeStringToTrainCase("Bingo Bango Bongo")).toBe("Bingo-Bango-Bongo");
    expect(normalizeStringToTrainCase("Bingo Bango bongo")).toBe("Bingo-Bango-Bongo");
    expect(normalizeStringToTrainCase("Bingo bango Bongo")).toBe("Bingo-Bango-Bongo");
    expect(normalizeStringToTrainCase("Bingo bango bongo")).toBe("Bingo-Bango-Bongo");
    expect(normalizeStringToTrainCase("bingo Bango Bongo")).toBe("Bingo-Bango-Bongo");
    expect(normalizeStringToTrainCase("bingo Bango bongo")).toBe("Bingo-Bango-Bongo");
    expect(normalizeStringToTrainCase("bingo bango Bongo")).toBe("Bingo-Bango-Bongo");
    expect(normalizeStringToTrainCase("bingo bango bongo")).toBe("Bingo-Bango-Bongo");
  });

  test("case conversion for Cobol Case (COBOL-CASE)", () => {
    expect(normalizeStringToCobolCase("Moot")).toBe("MOOT");
    expect(normalizeStringToCobolCase("moot")).toBe("MOOT");
    expect(normalizeStringToCobolCase("Foo Bar")).toBe("FOO-BAR");
    expect(normalizeStringToCobolCase("Foo bar")).toBe("FOO-BAR");
    expect(normalizeStringToCobolCase("foo Bar")).toBe("FOO-BAR");
    expect(normalizeStringToCobolCase("foo bar")).toBe("FOO-BAR");
    expect(normalizeStringToCobolCase("Bingo Bango Bongo")).toBe("BINGO-BANGO-BONGO");
    expect(normalizeStringToCobolCase("Bingo Bango bongo")).toBe("BINGO-BANGO-BONGO");
    expect(normalizeStringToCobolCase("Bingo bango Bongo")).toBe("BINGO-BANGO-BONGO");
    expect(normalizeStringToCobolCase("Bingo bango bongo")).toBe("BINGO-BANGO-BONGO");
    expect(normalizeStringToCobolCase("bingo Bango Bongo")).toBe("BINGO-BANGO-BONGO");
    expect(normalizeStringToCobolCase("bingo Bango bongo")).toBe("BINGO-BANGO-BONGO");
    expect(normalizeStringToCobolCase("bingo bango Bongo")).toBe("BINGO-BANGO-BONGO");
    expect(normalizeStringToCobolCase("bingo bango bongo")).toBe("BINGO-BANGO-BONGO");
  });

  test("case conversion for Camel Case (camelCase)", () => {
    expect(normalizeStringToCamelCase("Moot")).toBe("moot");
    expect(normalizeStringToCamelCase("moot")).toBe("moot");
    expect(normalizeStringToCamelCase("Foo Bar")).toBe("fooBar");
    expect(normalizeStringToCamelCase("Foo bar")).toBe("fooBar");
    expect(normalizeStringToCamelCase("foo Bar")).toBe("fooBar");
    expect(normalizeStringToCamelCase("foo bar")).toBe("fooBar");
    expect(normalizeStringToCamelCase("Bingo Bango Bongo")).toBe("bingoBangoBongo");
    expect(normalizeStringToCamelCase("Bingo Bango bongo")).toBe("bingoBangoBongo");
    expect(normalizeStringToCamelCase("Bingo bango Bongo")).toBe("bingoBangoBongo");
    expect(normalizeStringToCamelCase("Bingo bango bongo")).toBe("bingoBangoBongo");
    expect(normalizeStringToCamelCase("bingo Bango Bongo")).toBe("bingoBangoBongo");
    expect(normalizeStringToCamelCase("bingo Bango bongo")).toBe("bingoBangoBongo");
    expect(normalizeStringToCamelCase("bingo bango Bongo")).toBe("bingoBangoBongo");
    expect(normalizeStringToCamelCase("bingo bango bongo")).toBe("bingoBangoBongo");
  });

  test("case conversion for Pascal Case (PascalCase)", () => {
    expect(normalizeStringToPascalCase("Moot")).toBe("Moot");
    expect(normalizeStringToPascalCase("moot")).toBe("Moot");
    expect(normalizeStringToPascalCase("Foo Bar")).toBe("FooBar");
    expect(normalizeStringToPascalCase("Foo bar")).toBe("FooBar");
    expect(normalizeStringToPascalCase("foo Bar")).toBe("FooBar");
    expect(normalizeStringToPascalCase("foo bar")).toBe("FooBar");
    expect(normalizeStringToPascalCase("Bingo Bango Bongo")).toBe("BingoBangoBongo");
    expect(normalizeStringToPascalCase("Bingo Bango bongo")).toBe("BingoBangoBongo");
    expect(normalizeStringToPascalCase("Bingo bango Bongo")).toBe("BingoBangoBongo");
    expect(normalizeStringToPascalCase("Bingo bango bongo")).toBe("BingoBangoBongo");
    expect(normalizeStringToPascalCase("bingo Bango Bongo")).toBe("BingoBangoBongo");
    expect(normalizeStringToPascalCase("bingo Bango bongo")).toBe("BingoBangoBongo");
    expect(normalizeStringToPascalCase("bingo bango Bongo")).toBe("BingoBangoBongo");
    expect(normalizeStringToPascalCase("bingo bango bongo")).toBe("BingoBangoBongo");
  });

  test("case conversion for Snake Case (snake_case)", () => {
    expect(normalizeStringToSnakeCase("Moot")).toBe("moot");
    expect(normalizeStringToSnakeCase("moot")).toBe("moot");
    expect(normalizeStringToSnakeCase("Foo Bar")).toBe("foo_bar");
    expect(normalizeStringToSnakeCase("Foo bar")).toBe("foo_bar");
    expect(normalizeStringToSnakeCase("foo Bar")).toBe("foo_bar");
    expect(normalizeStringToSnakeCase("foo bar")).toBe("foo_bar");
    expect(normalizeStringToSnakeCase("Bingo Bango Bongo")).toBe("bingo_bango_bongo");
    expect(normalizeStringToSnakeCase("Bingo Bango bongo")).toBe("bingo_bango_bongo");
    expect(normalizeStringToSnakeCase("Bingo bango Bongo")).toBe("bingo_bango_bongo");
    expect(normalizeStringToSnakeCase("Bingo bango bongo")).toBe("bingo_bango_bongo");
    expect(normalizeStringToSnakeCase("bingo Bango Bongo")).toBe("bingo_bango_bongo");
    expect(normalizeStringToSnakeCase("bingo Bango bongo")).toBe("bingo_bango_bongo");
    expect(normalizeStringToSnakeCase("bingo bango Bongo")).toBe("bingo_bango_bongo");
    expect(normalizeStringToSnakeCase("bingo bango bongo")).toBe("bingo_bango_bongo");
  });

  test("case conversion for Shouting Snake Case (SHOUTING_SNAKE_CASE)", () => {
    expect(normalizeStringToShoutingSnakeCase("Moot")).toBe("MOOT");
    expect(normalizeStringToShoutingSnakeCase("moot")).toBe("MOOT");
    expect(normalizeStringToShoutingSnakeCase("Foo Bar")).toBe("FOO_BAR");
    expect(normalizeStringToShoutingSnakeCase("Foo bar")).toBe("FOO_BAR");
    expect(normalizeStringToShoutingSnakeCase("foo Bar")).toBe("FOO_BAR");
    expect(normalizeStringToShoutingSnakeCase("foo bar")).toBe("FOO_BAR");
    expect(normalizeStringToShoutingSnakeCase("Bingo Bango Bongo")).toBe("BINGO_BANGO_BONGO");
    expect(normalizeStringToShoutingSnakeCase("Bingo Bango bongo")).toBe("BINGO_BANGO_BONGO");
    expect(normalizeStringToShoutingSnakeCase("Bingo bango Bongo")).toBe("BINGO_BANGO_BONGO");
    expect(normalizeStringToShoutingSnakeCase("Bingo bango bongo")).toBe("BINGO_BANGO_BONGO");
    expect(normalizeStringToShoutingSnakeCase("bingo Bango Bongo")).toBe("BINGO_BANGO_BONGO");
    expect(normalizeStringToShoutingSnakeCase("bingo Bango bongo")).toBe("BINGO_BANGO_BONGO");
    expect(normalizeStringToShoutingSnakeCase("bingo bango Bongo")).toBe("BINGO_BANGO_BONGO");
    expect(normalizeStringToShoutingSnakeCase("bingo bango bongo")).toBe("BINGO_BANGO_BONGO");
  });

  test("case conversion for Kabab Case (kebab-case)", () => {
    expect(normalizeStringToKebabCase("Moot")).toBe("moot");
    expect(normalizeStringToKebabCase("moot")).toBe("moot");
    expect(normalizeStringToKebabCase("Foo Bar")).toBe("foo-bar");
    expect(normalizeStringToKebabCase("Foo bar")).toBe("foo-bar");
    expect(normalizeStringToKebabCase("foo Bar")).toBe("foo-bar");
    expect(normalizeStringToKebabCase("foo bar")).toBe("foo-bar");
    expect(normalizeStringToKebabCase("Bingo Bango Bongo")).toBe("bingo-bango-bongo");
    expect(normalizeStringToKebabCase("Bingo Bango bongo")).toBe("bingo-bango-bongo");
    expect(normalizeStringToKebabCase("Bingo bango Bongo")).toBe("bingo-bango-bongo");
    expect(normalizeStringToKebabCase("Bingo bango bongo")).toBe("bingo-bango-bongo");
    expect(normalizeStringToKebabCase("bingo Bango Bongo")).toBe("bingo-bango-bongo");
    expect(normalizeStringToKebabCase("bingo Bango bongo")).toBe("bingo-bango-bongo");
    expect(normalizeStringToKebabCase("bingo bango Bongo")).toBe("bingo-bango-bongo");
    expect(normalizeStringToKebabCase("bingo bango bongo")).toBe("bingo-bango-bongo");
  });
});
```

```
describe('toPascalCase', () => {
  test('converts simple phrase', () => {
    expect(toPascalCase('example ontology name')).toBe('ExampleOntologyName');
  });

  test('handles punctuation and multiple separators', () => {
    expect(toPascalCase('example-ontology_name.foo')).toBe('ExampleOntologyNameFoo');
  });

  test('handles null gracefully', () => {
    expect(toPascalCase(null)).toBe('Ontology');
  });
});
```

```
// rules/use-split-words.js
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce the use of splitStringToWords in case normalization functions.",
    },
    messages: {
      mustUseSplitWords:
        "Function '{{ name }}' must process its input through 'splitStringToWords(str)' instead of inline regex replace.",
    },
    schema: [], // No options required
  },
  create(context) {
    return {
      FunctionDeclaration(node) {
        const functionName = node.id ? node.id.name : "";

        // Only target normalizer functions (skip helper function and other utils)
        if (
          !functionName.startsWith("normalizeStringTo") ||
          functionName === "splitStringToWords"
        ) {
          return;
        }

        const sourceCode = context.getSourceCode().getText(node);

        // Verify splitStringToWords is referenced inside the function body
        if (!sourceCode.includes("splitStringToWords")) {
          context.report({
            node,
            data: { name: functionName },
            messageId: "mustUseSplitWords",
          });
        }
      },
    };
  },
};
```

```
// check-string-utils.js
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "stringUtils.js"); // Adjust to your file path
const fileContent = fs.readFileSync(filePath, "utf8");

const requiredFunctions = [
  "normalizeStringToKebabCase",
  "normalizeStringToFlatCase",
  "normalizeStringToUpperFlatCase",
  "normalizeStringToTrainCase",
  "normalizeStringToCobolCase",
  "normalizeStringToCamelCase",
  "normalizeStringToPascalCase",
  "normalizeStringToSnakeCase",
  "normalizeStringToShoutingSnakeCase",
];

let errors = 0;

for (const fnName of requiredFunctions) {
  // Regex to extract function body
  const fnRegex = new RegExp(`function ${fnName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\}`);
  const match = fileContent.match(fnRegex);

  if (!match) {
    console.error(`❌ Missing required function: ${fnName}`);
    errors++;
    continue;
  }

  const body = match[1];
  if (!body.includes("splitStringToWords")) {
    console.error(`❌ ${fnName} does not utilize splitStringToWords!`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\nValidation failed with ${errors} issue(s).`);
  process.exit(1);
} else {
  console.log("✅ All normalizeStringTo* functions properly utilize splitStringToWords.");
}
```