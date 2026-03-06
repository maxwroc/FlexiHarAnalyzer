import { Component, createRef } from "preact";
import { TabFieldAccordeon } from "../../config";
import { renderField } from "./render-field.tsx";

interface IAccordeonContainerFieldState { opened: boolean }

export class AccordeonContainerField extends Component<{ field: TabFieldAccordeon, fieldIndex: number }, IAccordeonContainerFieldState> {

    private radioBtn = createRef<HTMLInputElement>();

    componentWillUpdate(_nextProps: any, nextState: IAccordeonContainerFieldState) {
        if (this.radioBtn.current && !this.radioBtn.current.checked) {
            nextState.opened = false;
        }
    }

    onOpen() {
        if (!this.state.opened) {
            this.setState({ opened: true });
        }
    }

    render() {
        return ( 
        <div class={"collapse collapse-plus bg-base-100" + (this.props.fieldIndex > 0 ? " mt-5" : "")}>
            <input type="radio" name="accordeon-field" ref={this.radioBtn} onChange={() => this.onOpen()} />
            <div class="collapse-title text-xl font-medium">{this.props.field.label}</div>
            <div class="collapse-content">
                {this.state.opened && this.props.field.fields.map((f, i) => renderField(f, i))}
            </div>
        </div>
        )
    }
}
