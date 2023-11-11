import * as React from 'react';
import { Component, CSSProperties } from 'react';

import { Cell, LinkVertex } from './elements';
import { ElementLayer } from './elementLayer';
import { Vector } from './geometry';
import { LinkLayer, LinkMarkers } from './linkLayer';
import { DiagramModel } from './model';
import { RenderingState } from './renderingState';
import { DiagramView } from './view';

export interface PaperProps {
    model: DiagramModel;
    view: DiagramView;
    renderingState: RenderingState;
    paperTransform: PaperTransform;
    onPointerDown?: (e: React.MouseEvent<HTMLElement>, cell: Cell | undefined) => void;
    onContextMenu?: (e: React.MouseEvent<HTMLElement>, cell: Cell | undefined) => void;
    group?: string;
    linkLayerWidgets?: React.ReactElement<any>;
    elementLayerWidgets?: React.ReactElement<any>;
}

const CLASS_NAME = 'ontodia-paper';

export class Paper extends Component<PaperProps> {
    render() {
        const {
            model, view, renderingState, group, paperTransform, linkLayerWidgets, elementLayerWidgets,
        } = this.props;
        const {width, height, originX, originY, scale, paddingX, paddingY} = paperTransform;

        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        // using padding instead of margin in combination with setting width and height
        // on .paper element to avoid "over-constrained" margins, see an explanation here:
        // https://stackoverflow.com/questions/11695354
        const style: CSSProperties = {
            width: scaledWidth + paddingX,
            height: scaledHeight + paddingY,
            marginLeft: paddingX,
            marginTop: paddingY,
            paddingRight: paddingX,
            paddingBottom: paddingY,
        };
        const htmlTransformStyle: React.CSSProperties = {
            position: 'absolute', left: 0, top: 0,
            transform: `scale(${scale},${scale})translate(${originX}px,${originY}px)`,
        };

        return (
            <div className={CLASS_NAME}
                style={style}
                onMouseDown={this.onMouseDown}
                onContextMenu={this.onContextMenu}>
                <TransformedSvgCanvas className={`${CLASS_NAME}__canvas`}
                    style={{overflow: 'visible'}}
                    paperTransform={paperTransform}>
                    <LinkMarkers model={model}
                        renderingState={renderingState}
                    />
                    <LinkLayer model={model}
                        view={view}
                        renderingState={renderingState}
                        links={model.links}
                        group={group}
                    />
                </TransformedSvgCanvas>
                {linkLayerWidgets}
                <ElementLayer model={model}
                    view={view}
                    renderingState={renderingState}
                    group={group}
                    style={htmlTransformStyle}
                />
                {elementLayerWidgets}
            </div>
        );
    }

    private onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const {model, onPointerDown} = this.props;
        if (onPointerDown) {
            const cell = e.target instanceof Element
                ? findCell(e.target, e.currentTarget, model)
                : undefined;
            onPointerDown(e, cell);
        }
    };

    private onContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        const {model, onContextMenu} = this.props;
        if (onContextMenu) {
            const cell = e.target instanceof Element
                ? findCell(e.target, e.currentTarget, model)
                : undefined;
            onContextMenu(e, cell);
        }
    };
}

function findCell(bottom: Element, top: Element, model: DiagramModel): Cell | undefined {
    let target: Node | null = bottom;
    let vertexIndex: number | undefined;
    while (true) {
        if (target instanceof Element) {
            if (target.hasAttribute('data-element-id')) {
                return model.getElement(target.getAttribute('data-element-id')!);
            } else if (target.hasAttribute('data-link-id')) {
                const link = model.getLinkById(target.getAttribute('data-link-id')!);
                if (!link) {
                    return undefined;
                }
                return typeof vertexIndex === 'number' ? new LinkVertex(link, vertexIndex) : link;
            } else if (target.hasAttribute('data-vertex')) {
                vertexIndex = Number(target.getAttribute('data-vertex'));
            }
        }
        if (!target || target === top) { break; }
        target = target.parentNode;
    }
    return undefined;
}

export interface PaperTransform {
    width: number;
    height: number;
    originX: number;
    originY: number;
    scale: number;
    paddingX: number;
    paddingY: number;
}

export interface TransformedSvgCanvasProps extends React.HTMLProps<SVGSVGElement> {
    paperTransform: PaperTransform;
}

export class TransformedSvgCanvas extends Component<TransformedSvgCanvasProps> {
    private static readonly SVG_STYLE: CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
    };
    render() {
        const {paperTransform, style, children, ...otherProps} = this.props;
        const {width, height, originX, originY, scale, paddingX, paddingY} = paperTransform;
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        let svgStyle = TransformedSvgCanvas.SVG_STYLE;
        if (style) {
            svgStyle = {...svgStyle, ...style};
        }
        return (
            <svg width={scaledWidth} height={scaledHeight} style={svgStyle} {...otherProps}>
                <g transform={`scale(${scale},${scale})translate(${originX},${originY})`}>
                    {children}
                </g>
            </svg>
        );
    }
}

/**
 * @returns scrollable pane size in non-scaled pane coords.
 */
export function totalPaneSize(pt: PaperTransform): Vector {
    return {
        x: pt.width * pt.scale + pt.paddingX * 2,
        y: pt.height * pt.scale + pt.paddingY * 2,
    };
}

/**
 * @returns scrollable pane top-left corner position in non-scaled pane coords.
 */
export function paneTopLeft(pt: PaperTransform): Vector {
    return {x: -pt.paddingX, y: -pt.paddingY};
}

export function paneFromPaperCoords(paper: Vector, pt: PaperTransform): Vector {
    return {
        x: (paper.x + pt.originX) * pt.scale,
        y: (paper.y + pt.originY) * pt.scale,
    };
}

export function paperFromPaneCoords(pane: Vector, pt: PaperTransform): Vector {
    return {
        x: pane.x / pt.scale - pt.originX,
        y: pane.y / pt.scale - pt.originY,
    };
}
