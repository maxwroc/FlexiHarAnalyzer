import { Component, createRef } from "preact";
import { TabFieldAccordion } from "../../types/config";
import { renderField } from "./render-field.tsx";

interface IAccordionContainerFieldState { opened: boolean }

export class AccordionContainerField extends Component<{ field: TabFieldAccordion, fieldIndex: number }, IAccordionContainerFieldState> {

    private radioBtn = createRef<HTMLInputElement>();

    componentWillUpdate(_nextProps: any, nextState: IAccordionContainerFieldState) {
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
            <input type="radio" name="accordion-field" ref={this.radioBtn} onChange={() => this.onOpen()} />
            <div class="collapse-title text-xl font-medium">{this.props.field.label}</div>
            <div class="collapse-content">
                {this.state.opened && this.props.field.fields.map((f, i) => renderField(f, i))}
            </div>
        </div>
        )
    }
}
