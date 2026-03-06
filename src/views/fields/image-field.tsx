import { Component } from "preact";
import { TabFieldImage } from "../../types/config";

interface IImageFieldProps {
    field: TabFieldImage;
}

interface IImageFieldState {
    naturalWidth: number;
    naturalHeight: number;
    loaded: boolean;
}

export class ImageField extends Component<IImageFieldProps, IImageFieldState> {

    constructor(props: IImageFieldProps) {
        super(props);
        this.state = { naturalWidth: 0, naturalHeight: 0, loaded: false };
    }

    private onImageLoad = (e: Event) => {
        const img = e.target as HTMLImageElement;
        this.setState({
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            loaded: true,
        });
    }

    render() {
        const { field } = this.props;
        const { naturalWidth, naturalHeight, loaded } = this.state;

        const sizeKB = (field.size / 1024).toFixed(2);

        return (
            <div class="flex flex-col gap-4">
                {field.label && (
                    <div class="label">
                        <span class="label-text">{field.label}</span>
                    </div>
                )}
                <div class="flex justify-center border border-base-content/20 rounded-lg p-4 bg-base-200">
                    <img
                        src={field.src}
                        onLoad={this.onImageLoad}
                        class="max-w-full max-h-[500px] object-contain"
                        alt={field.label || "Image preview"}
                    />
                </div>
                {loaded && (
                    <div class="flex flex-wrap gap-4">
                        <div class="badge badge-neutral badge-md gap-1">
                            <span class="opacity-60">Resolution:</span> {naturalWidth} x {naturalHeight} px
                        </div>
                        <div class="badge badge-neutral badge-md gap-1">
                            <span class="opacity-60">Size:</span> {sizeKB} KB
                        </div>
                        <div class="badge badge-neutral badge-md gap-1">
                            <span class="opacity-60">Type:</span> {field.mimeType}
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
