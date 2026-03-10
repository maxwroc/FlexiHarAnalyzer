import { Component, createRef } from "preact";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState } from "@codemirror/state";
import { indentUnit } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentWithTab } from "@codemirror/commands";
import { keymap } from "@codemirror/view";
import { harAutocompletion } from "../services/parser-editor/har-completions";

export interface IParserEditorProps {
    isOpen: boolean;
    fileName: string;
    fileContent: string;
    isNew: boolean;
    onSave: (fileName: string, content: string) => void;
    onClose: () => void;
}

interface IParserEditorState {
    fileName: string;
    content: string;
    isDirty: boolean;
}

export class ParserEditor extends Component<IParserEditorProps, IParserEditorState> {

    private editorRef = createRef<HTMLDivElement>();
    private editorView: EditorView | null = null;

    constructor(props: IParserEditorProps) {
        super(props);
        this.state = {
            fileName: props.fileName,
            content: props.fileContent,
            isDirty: false,
        };
    }

    componentDidUpdate(prevProps: IParserEditorProps) {
        if (prevProps.isOpen !== this.props.isOpen && this.props.isOpen) {
            this.setState({
                fileName: this.props.fileName,
                content: this.props.fileContent,
                isDirty: false,
            }, () => this.initEditor());
        }
    }

    componentWillUnmount() {
        this.destroyEditor();
    }

    private initEditor() {
        // Defer to next frame so the container div is rendered
        requestAnimationFrame(() => {
            this.destroyEditor();

            if (!this.editorRef.current) return;

            this.editorView = new EditorView({
                state: EditorState.create({
                    doc: this.state.content,
                    extensions: [
                        basicSetup,
                        keymap.of([indentWithTab]),
                        javascript(),
                        harAutocompletion(),
                        oneDark,
                        EditorState.tabSize.of(4),
                        indentUnit.of("    "),
                        EditorView.updateListener.of(update => {
                            if (update.docChanged) {
                                this.setState({ content: update.state.doc.toString(), isDirty: true });
                            }
                        }),
                        EditorView.theme({
                            "&": { height: "100%", fontSize: "14px", textAlign: "left" },
                            ".cm-scroller": { overflow: "auto" },
                            ".cm-content": { textAlign: "left" },
                        }),
                    ],
                }),
                parent: this.editorRef.current,
            });
        });
    }

    private destroyEditor() {
        if (this.editorView) {
            this.editorView.destroy();
            this.editorView = null;
        }
    }

    render() {
        if (!this.props.isOpen) return null;

        return (
            <div class="modal modal-open" onMouseDown={(e) => { if (e.target === e.currentTarget) this.tryClose(); }}>
                <div class="modal-box flex flex-col text-left resize overflow-auto" style="min-width: 400px; min-height: 300px; width: 56rem; height: 85vh; max-width: 95vw; max-height: 95vh;">
                    <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => this.tryClose()}>✕</button>
                    <h3 class="font-bold text-lg mb-4">{this.props.isNew ? "Create Parser" : `Editing parser: ${this.state.fileName}`}</h3>

                    {/* File name */}
                    {this.props.isNew && (
                    <div class="mb-3">
                            <div class="join w-full">
                                <span class="btn btn-sm join-item no-animation font-semibold">File name</span>
                                <input
                                    type="text"
                                    class="input input-bordered input-sm join-item w-full"
                                    value={this.state.fileName}
                                    onInput={(e) => this.setState({ fileName: (e.target as HTMLInputElement).value })}
                                    placeholder="my-parser.js"
                                />
                            </div>
                    </div>
                    )}

                    {/* Code editor */}
                    <div class="form-control flex-1 min-h-0 mb-3 flex flex-col">
                        <label class="label py-1">
                            <span class="label-text font-semibold">Code</span>
                        </label>
                        <div
                            ref={this.editorRef}
                            class="flex-1 min-h-0 border border-base-300 rounded-lg overflow-hidden"
                        />
                    </div>

                    {/* Actions */}
                    <div class="modal-action mt-0">
                        <button class="btn btn-ghost btn-sm" onClick={() => this.downloadFile()}>
                            <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                        </button>
                        <button class="btn btn-ghost btn-sm" onClick={() => this.tryClose()}>Cancel</button>
                        <button
                            class="btn btn-primary btn-sm"
                            onClick={() => this.handleSave()}
                            disabled={!this.state.fileName.trim() || !this.state.content.trim()}
                        >Save</button>
                    </div>
                </div>
            </div>
        );
    }

    private tryClose() {
        if (this.state.isDirty) {
            if (!confirm("You have unsaved changes. Discard and close?")) {
                return;
            }
        }
        this.props.onClose();
    }

    private handleSave() {
        const fileName = this.state.fileName.trim();
        if (!fileName || !this.state.content.trim()) return;

        this.props.onSave(fileName, this.state.content);
    }

    private downloadFile() {
        const fileName = this.state.fileName.trim() || "parser.js";
        const blob = new Blob([this.state.content], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }
}
