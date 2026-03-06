import { Component, createRef } from "preact";
import { TabFieldJson } from "../../config";
import { ISearchPlugin, JsonViewer, plugins } from "sonj-review";

export class JsonField extends Component<{ field: TabFieldJson, fieldIndex: number }> {

    private listingContainer = createRef<HTMLDivElement>();

    private searchPlugin: ISearchPlugin | undefined;

    componentDidMount() {
        // It is called when the element is added to the DOM for the first time
        this.renderJsonViewer();
    }

    componentDidUpdate() {
        // It is called whenever the existing element is updated
        this.renderJsonViewer();
    }

    render() {   
        return (
            <label class="form-control w-full" for="zonk">
                {this.props.field.label && <div class="label">
                    <span class="label-text">{this.props.field.label}</span>
                </div>}
                {this.props.field.options?.searchEnabled && 
                    <input type="text" class="input input-bordered input-sm w-full" placeholder={"Search string"} onKeyUp={evt => this.onSearchKeyUp(evt)} />}
                <code class="textarea textarea-bordered w-full" ref={this.listingContainer} id="zonk"></code>
            </label>
        )
    }

    private onSearchKeyUp(evt: KeyboardEvent) {
        if (evt.key != "Enter") {
            return;
        }

        this.searchPlugin!.query((evt.currentTarget! as HTMLInputElement).value)
    }

    private renderJsonViewer() {
        const menuItems = plugins.propertyMenu.items!;

        const plug: any[]= [];

        plug.push(plugins.propertyTeaser({ properties: { names: this.props.field.options?.teaserFields || ["email", "upn", "EntityType", "entityType", "Type", "PeopleType", "PeopleSubtype"] } }));
        plug.push(plugins.truncate({ maxNameLength: 0, maxValueLength: 80 }));
        plug.push(plugins.propertyMenu([
            menuItems.copyName,
            menuItems.copyValue,
            menuItems.copyFormattedValue,
            menuItems.parseJsonValue,
        ]));

        if (this.props.field.options?.searchEnabled) {
            this.searchPlugin = plugins.search(this.props.field.value);
            plug.push(this.searchPlugin)
        }

        plug.push(plugins.autoExpand(this.props.field.options && this.props.field.options.autoExpand != undefined ? this.props.field.options.autoExpand : 2 ));

        // clean up the previous one
        this.listingContainer.current!.innerHTML = "";

        new JsonViewer(this.props.field.value, "Object", plug).render(this.listingContainer.current!);
    }
}
