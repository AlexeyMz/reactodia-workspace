import * as React from 'react';

import { EventSource } from '../coreUtils/events';

import { defineCanvasWidget } from '../diagram/canvasWidget';

import { Canvas } from '../widgets/canvas';
import { ClassTree, ClassTreeProps } from '../widgets/classTree';
import {
    ConnectionsMenu, ConnectionsMenuCommands,
} from '../widgets/connectionsMenu';
import { DropOnCanvas } from '../widgets/dropOnCanvas';
import { Halo } from '../widgets/halo';
import { HaloLink } from '../widgets/haloLink';
import { InstancesSearch, InstancesSearchProps, InstancesSearchCommands } from '../widgets/instancesSearch';
import { LinkTypesToolbox, LinkTypesToolboxProps } from '../widgets/linksToolbox';
import { Navigator } from '../widgets/navigator';
import { Selection } from '../widgets/selection';
import { Toolbar, ToolbarProps } from '../widgets/toolbar';
import {
    ToolbarActionClearAll, ToolbarActionExport, ToolbarActionUndo, ToolbarActionRedo,
    ToolbarActionLayout, ToolbarLanguageSelector, WorkspaceLanguage,
} from '../widgets/toolbarAction';
import { ZoomControl } from '../widgets/zoomControl';

import type { BaseDefaultWorkspaceProps } from './defaultWorkspace';
import {
    WorkspaceLayoutRow, WorkspaceLayoutColumn, WorkspaceLayoutItem, WorkspaceLayoutContainerProps,
} from './workspaceLayout';
import { WorkspaceRoot } from './workspaceRoot';

export interface ClassicWorkspaceProps extends BaseDefaultWorkspaceProps {
    /**
     * Props for the left layout column of the default workspace.
     *
     * @default {defaultSize: 275}
     */
    leftColumn?: Omit<WorkspaceLayoutContainerProps, 'children'>;
    /**
     * Props for the right layout column of the default workspace.
     *
     * @default {defaultSize: 275, defaultCollapsed: true}
     */
    rightColumn?: Omit<WorkspaceLayoutContainerProps, 'children'>;
    /**
     * Props for the `ClassicToolbar` canvas widget.
     *
     * If specified as `null`, the component will not be rendered.
     *
     * @see ClassicToolbar
     */
    toolbar?: Partial<ClassicToolbarProps> | null;
    /**
     * Props for the `ClassTree` component.
     *
     * @see ClassTree
     */
    classTree?: ClassTreeProps;
    /**
     * Props for the `InstancesSearch` component.
     *
     * @see InstancesSearch
     */
    instancesSearch?: Omit<InstancesSearchProps, 'commands'>;
    /**
     * Props for the `LinkTypesToolbox` component.
     *
     * @see LinkTypesToolbox
     */
    linkToolbox?: LinkTypesToolboxProps;
}

/**
 * Component with default ready-to-use workspace with a canvas and
 * all components and widgets pre-configured (classic layout).
 *
 * @category Components
 */
export function ClassicWorkspace(props: ClassicWorkspaceProps) {
    const {
        leftColumn, rightColumn,
        canvas, connectionsMenu, dropOnCanvas, halo, haloLink, selection, navigator, zoomControl,
        toolbar, classTree, instancesSearch, linkToolbox,
    } = props;

    const [connectionsMenuCommands] = React.useState(() =>
        props.connectionsMenuCommands ?? new EventSource<ConnectionsMenuCommands>()
    );
    const [instancesSearchCommands] = React.useState(() =>
        props.instancesSearchCommands ?? new EventSource<InstancesSearchCommands>()
    );

    return (
        <WorkspaceRoot>
            <WorkspaceLayoutRow>
                <WorkspaceLayoutColumn defaultSize={275}
                    {...leftColumn}>
                    <WorkspaceLayoutItem id='classes' heading='Classes'>
                        <ClassTree {...classTree}
                            instancesSearchCommands={instancesSearchCommands}
                        />
                    </WorkspaceLayoutItem>
                    <WorkspaceLayoutItem id='instances' heading='Instances'>
                        <InstancesSearch {...instancesSearch}
                            commands={instancesSearchCommands}
                        />
                    </WorkspaceLayoutItem>
                </WorkspaceLayoutColumn>
                <WorkspaceLayoutItem id='canvas'>
                    <Canvas {...canvas}>
                        {connectionsMenu === null ? null : (
                            <ConnectionsMenu {...connectionsMenu}
                                commands={connectionsMenuCommands}
                                instancesSearchCommands={instancesSearchCommands}
                            />
                        )}
                        {dropOnCanvas === null ? null : <DropOnCanvas {...dropOnCanvas} />}
                        {halo === null ? null : (
                            <Halo {...halo}
                                instancesSearchCommands={instancesSearchCommands}
                                connectionsMenuCommands={
                                    connectionsMenu === null ? undefined : connectionsMenuCommands
                                }
                            />
                        )}
                        {haloLink === null ? null : <HaloLink {...haloLink} />}
                        {selection === null ? null : (
                            <Selection {...selection}
                                connectionsMenuCommands={
                                    connectionsMenu === null ? undefined : connectionsMenuCommands
                                }
                            />
                        )}
                        {navigator === null ? null : <Navigator dock='se' {...navigator} />}
                        {toolbar === null ? null : <ClassicToolbar dock='nw' {...toolbar} />}
                        {zoomControl === null ? null : <ZoomControl dock='sw' {...zoomControl} />}
                    </Canvas>
                </WorkspaceLayoutItem>
                <WorkspaceLayoutColumn defaultSize={275}
                    defaultCollapsed={true}
                    {...rightColumn}>
                    <WorkspaceLayoutItem id='connections'
                        heading='Connections'>
                        <LinkTypesToolbox {...linkToolbox}
                            instancesSearchCommands={instancesSearchCommands}
                        />
                    </WorkspaceLayoutItem>
                </WorkspaceLayoutColumn>
            </WorkspaceLayoutRow>
        </WorkspaceRoot>
    );
}

/**
 * Props for `ClassicToolbar` component.
 *
 * @see ClassicToolbar
 */
export interface ClassicToolbarProps
    extends Pick<ToolbarProps, 'dock' | 'dockOffsetX' | 'dockOffsetY'>
{
    /**
     * Main menu content, in a form of `ToolbarAction` elements.
     *
     * If `null`, the menu toggle button will be hidden.
     *
     * **Default**:
     * ```jsx
     * <>
     *     <ToolbarActionClearAll />
     *     <ToolbarActionExport kind='exportRaster' />
     *     <ToolbarActionExport kind='exportSvg' />
     *     <ToolbarActionExport kind='print' />
     * </>
     * ```
     */
    menu?: React.ReactNode | null;
    /**
     * Toolbar panel content, in a form of `ToolbarAction` or other elements.
     *
     * If `null`, the panel will be hidden.
     *
     * **Default**:
     * ```jsx
     * <>
     *     <ToolbarActionUndo />
     *     <ToolbarActionRedo />
     *     <ToolbarActionLayout />
     *     <ToolbarLanguageSelector languages={props.languages} />
     * </>
     * ```
     */
    children?: React.ReactNode | null;
    /**
     * Set of languages for the diagram data language selector.
     *
     * If not specified or empty, the selector will be hidden.
     */
    languages?: ReadonlyArray<WorkspaceLanguage>;
}

/**
 * Canvas widget component to display a toolbar with defaults
 * for the classic workspace layout.
 *
 * @category Components
 * @see ClassicWorkspace
 */
export function ClassicToolbar(props: ClassicToolbarProps) {
    const {dock, dockOffsetX, dockOffsetY, menu, children, languages = []} = props;
    const menuContent = menu === null ? null : (
        menu ?? <>
            <ToolbarActionClearAll />
            <ToolbarActionExport kind='exportRaster' />
            <ToolbarActionExport kind='exportSvg' />
            <ToolbarActionExport kind='print' />
        </>
    );
    const childrenContent = children === null ? null : (
        children ?? <>
            <ToolbarActionUndo />
            <ToolbarActionRedo />
            <ToolbarActionLayout />
            <ToolbarLanguageSelector languages={languages} />
        </>
    );
    return (
        <Toolbar dock={dock}
            dockOffsetX={dockOffsetX}
            dockOffsetY={dockOffsetY}
            menu={menuContent}>
            {childrenContent}
        </Toolbar>
    );
}

defineCanvasWidget(ClassicToolbar, element => ({element, attachment: 'viewport'}));
