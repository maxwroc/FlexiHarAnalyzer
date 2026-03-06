import { Entry } from "har-format";
import { Component } from "preact";
import { CustomTab, TabField } from "../../types/config";
import { renderField } from "../fields/render-field";

interface IGenericTabProps { tab: CustomTab, entry: Entry, isActive: boolean, onTabClick: { (tabName: string): void } }

interface IGenericTabState { fields: TabField[], isRendered: boolean }


export class GenericTab extends Component<IGenericTabProps, IGenericTabState> {

    constructor(props: any) {
        super(props);

        this.state = {
            fields: [],
            isRendered: false,
        };
    }

    static getDerivedStateFromProps(props: IGenericTabProps, previousState: IGenericTabState): IGenericTabState | null {

        if (!previousState.isRendered && !props.isActive) {
            // we want to render the tab only if it was shown already or when it is active
            return null;
        }

        return {
            fields: props.tab.getFields(props.entry),
            isRendered: true,
        };
    }

    render() {        
        return <>
            <input
                type="radio"
                name="request_tabs"
                role="tab"
                onMouseDown={() => this.onClick()}
                class="tab [--tab-bg:var(--fallback-n,oklch(var(--n)))] [--tab-border-color:var(--fallback-n,oklch(var(--n)))] [--tab-color:var(--fallback-nc,oklch(var(--nc)))] text-nowrap"
                aria-label={this.props.tab.name}
                checked={this.props.isActive} />
            <div role="tabpanel" class="tab-content rounded-box p-6 bg-neutral w-full overflow-hidden">
                {this.state.fields.map((f, i) => renderField(f, i))}
            </div>
        </>;
    }

    private onClick() {
        this.props.onTabClick(this.props.tab.name);

        if (!this.state.isRendered) {
            this.setState({
                fields: this.props.tab.getFields(this.props.entry),
                isRendered: true,
            });
        }
    }
}
