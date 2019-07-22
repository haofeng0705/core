"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const testSelector = 'javascript';
function activate(context) {
    vscode.languages.registerHoverProvider(testSelector, {
        provideHover(document, position, token) {
            return new vscode.Hover('I am a hover!match number: ' + vscode.languages.match('javascript', document));
        },
    });
    vscode.languages.registerCompletionItemProvider(testSelector, {
        provideCompletionItems(document, position, token, context) {
            const simpleCompletion = new vscode.CompletionItem('Hello World!');
            const snippetCompletion = new vscode.CompletionItem('Good part of the day');
            // TODO 实现替换
            snippetCompletion.insertText = new vscode.SnippetString('Good ${1|morning,afternoon,evening|}. It is ${1}, right?');
            snippetCompletion.documentation = new vscode.MarkdownString("Inserts a snippet that lets you select the _appropriate_ part of the day for your greeting.");
            const commitCharacterCompletion = new vscode.CompletionItem('console');
            commitCharacterCompletion.commitCharacters = ['.'];
            commitCharacterCompletion.documentation = new vscode.MarkdownString('Press `.` to get `console.`');
            const commandCompletion = new vscode.CompletionItem('new');
            commandCompletion.kind = vscode.CompletionItemKind.Keyword;
            commandCompletion.insertText = 'new ';
            commandCompletion.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };
            return [
                {
                    label: 'getIniDouble',
                    kind: 2,
                    insertText: 'getIniDouble(${1:sec}, ${2: key})',
                    /// insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,/
                    documentation: '从ini类型的数据中，根据section和key，获取key对应的值，作为浮点数返回'
                },
                simpleCompletion,
                snippetCompletion,
                commitCharacterCompletion,
                commandCompletion
            ];
        }
    }, '.');
    const testStartPos = new vscode.Position(1, 1);
    const testEndPos = new vscode.Position(2, 1);
    const testRange = new vscode.Range(testStartPos, testEndPos);
    vscode.languages.registerDefinitionProvider(testSelector, {
        provideDefinition: (document, position, token) => {
            let new_position = new vscode.Position(position.line + 1, position.character);
            let newUri = vscode.Uri.parse(document.uri.toString().replace(/\d/, '6'));
            return new vscode.Location(newUri, new_position);
        }
    });
    vscode.languages.registerTypeDefinitionProvider(testSelector, {
        provideTypeDefinition: (document, position) => {
            let new_position = new vscode.Position(position.line + 2, position.character + 2);
            let newUri = vscode.Uri.parse(document.uri.toString().replace(/\d/, '1'));
            return new vscode.Location(newUri, new_position);
        }
    });
    vscode.languages.registerColorProvider(testSelector, {
        provideColorPresentations: (color, context, token) => {
            return [
                {
                    label: "color picker title text"
                }
            ];
        },
        provideDocumentColors: (doc, token) => {
            return [
                {
                    color: new vscode.Color(255, 0, 0, 0.5),
                    range: testRange,
                },
            ];
        }
    });
    vscode.languages.registerFoldingRangeProvider(testSelector, {
        provideFoldingRanges: (doc, context, token) => {
            return [new vscode.FoldingRange(0, 2, vscode.FoldingRangeKind.Comment)];
        }
    });
    vscode.languages.registerDocumentHighlightProvider(testSelector, {
        provideDocumentHighlights: (doc, pos, token) => {
            return [new vscode.DocumentHighlight(testRange, vscode.DocumentHighlightKind.Write)];
        }
    });
    vscode.languages.registerReferenceProvider(testSelector, {
        provideReferences: (doc, pos, context, token) => {
            let newUri = vscode.Uri.parse(doc.uri.toString().replace(/\d/, '1'));
            let new_position = new vscode.Position(pos.line + 2, pos.character + 2);
            return [new vscode.Location(newUri, new_position)];
        }
    });
    vscode.languages.setLanguageConfiguration(testSelector, {
        brackets: [['&', '&']]
    });
    vscode.languages.registerDocumentLinkProvider(testSelector, {
        provideDocumentLinks: (doc, token) => {
            return [new vscode.DocumentLink(testRange)];
        }
    });
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map