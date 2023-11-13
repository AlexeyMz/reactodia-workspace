import * as React from 'react';

import { mapAbortedToNull } from '../coreUtils/async';

import { PLACEHOLDER_ELEMENT_TYPE } from '../data/schema';
import { MetadataApi } from '../data/metadataApi';
import { ElementModel, ElementTypeIri } from '../data/model';

import { HtmlSpinner } from '../diagram/spinner';
import { DiagramView } from '../diagram/view';

import { EditorController } from '../editor/editorController';

import { createRequest } from '../widgets/instancesSearch';
import { ListElementView } from '../widgets/listElementView';

const CLASS_NAME = 'reactodia-edit-form';

export interface ElementValue {
    value: ElementModel;
    isNew: boolean;
    loading: boolean;
    error?: string;
    validated: boolean;
    allowChange: boolean;
}

export interface ElementTypeSelectorProps {
    editor: EditorController;
    view: DiagramView;
    metadataApi: MetadataApi | undefined;
    source: ElementModel;
    elementValue: ElementValue;
    onChange: (state: Pick<ElementValue, 'value' | 'isNew' | 'loading'>) => void;
}

interface State {
    elementTypes?: ReadonlyArray<ElementTypeIri>;
    searchString: string;
    isLoading?: boolean;
    existingElements: ReadonlyArray<ElementModel>;
}

export class ElementTypeSelector extends React.Component<ElementTypeSelectorProps, State> {
    private readonly cancellation = new AbortController();
    private filterCancellation = new AbortController();
    private loadingItemCancellation = new AbortController();

    constructor(props: ElementTypeSelectorProps) {
        super(props);
        this.state = {searchString: '', existingElements: []};
    }

    componentDidMount() {
        this.fetchPossibleElementTypes();
    }

    componentDidUpdate(prevProps: ElementTypeSelectorProps, prevState: State) {
        const {searchString} = this.state;
        if (searchString !== prevState.searchString) {
            this.searchExistingElements();
        }
    }

    componentWillUnmount() {
        this.cancellation.abort();
        this.filterCancellation.abort();
        this.loadingItemCancellation.abort();
    }

    private async fetchPossibleElementTypes() {
        const {view, metadataApi, source} = this.props;
        if (!metadataApi) { return; }
        const elementTypes = await mapAbortedToNull(
            metadataApi.typesOfElementsDraggedFrom(source, this.cancellation.signal),
            this.cancellation.signal
        );
        if (elementTypes === null) { return; }
        elementTypes.sort(makeElementTypeComparatorByLabel(view));
        this.setState({elementTypes});
    }

    private searchExistingElements() {
        const {editor, view} = this.props;
        const {searchString} = this.state;
        this.setState({existingElements: []});
        if (searchString.length > 0) {
            this.setState({isLoading: true});

            this.filterCancellation.abort();
            this.filterCancellation = new AbortController();
            const signal = this.filterCancellation.signal;

            const request = createRequest({text: searchString});
            editor.model.dataProvider.lookup(request).then(elements => {
                if (signal.aborted) { return; }
                const existingElements = elements.map(linked => linked.element);
                this.setState({existingElements, isLoading: false});
            });
        }
    }

    private onElementTypeChange = async (e: React.FormEvent<HTMLSelectElement>) => {
        this.setState({isLoading: true});

        this.loadingItemCancellation.abort();
        this.loadingItemCancellation = new AbortController();
        const signal = this.loadingItemCancellation.signal;

        const {onChange, metadataApi} = this.props;
        const classId = (e.target as HTMLSelectElement).value as ElementTypeIri;
        const elementModel = await mapAbortedToNull(
            metadataApi!.generateNewElement([classId], signal),
            signal
        );
        if (elementModel === null) { return; }
        this.setState({isLoading: false});
        onChange({
            value: elementModel,
            isNew: true,
            loading: false,
        });
    };

    private renderPossibleElementType = (elementType: ElementTypeIri) => {
        const {view} = this.props;
        const type = view.model.createClass(elementType);
        const label = view.formatLabel(type.label, type.id);
        return <option key={elementType} value={elementType}>{label}</option>;
    };

    private renderElementTypeSelector() {
        const {elementValue} = this.props;
        const {elementTypes, isLoading} = this.state;
        const value = elementValue.value.types.length ? elementValue.value.types[0] : '';
        if (isLoading) {
            return <HtmlSpinner width={20} height={20} />;
        }
        return (
            <div className={`${CLASS_NAME}__control-row`}>
                <label>Entity Type</label>
                {
                    elementTypes ? (
                        <select className='reactodia-form-control' value={value} onChange={this.onElementTypeChange}>
                            <option value={PLACEHOLDER_ELEMENT_TYPE} disabled={true}>Select entity type</option>
                            {
                                elementTypes.map(this.renderPossibleElementType)
                            }
                        </select>
                    ) : <div><HtmlSpinner width={20} height={20} /></div>
                }
                {elementValue.error ? <span className={`${CLASS_NAME}__control-error`}>{elementValue.error}</span> : ''}
            </div>
        );
    }

    private renderExistingElementsList() {
        const {view, editor, elementValue} = this.props;
        const {elementTypes, isLoading, existingElements} = this.state;
        if (isLoading) {
            return <HtmlSpinner width={20} height={20} />;
        }
        if (existingElements.length > 0) {
            return existingElements.map(element => {
                const isAlreadyOnDiagram = !editor.temporaryState.elements.has(element.id) && Boolean(
                    editor.model.elements.find(({iri, group}) => iri === element.id && group === undefined)
                );
                const hasAppropriateType = Boolean(
                    elementTypes && elementTypes.find(type => element.types.indexOf(type) >= 0)
                );
                return (
                    <ListElementView key={element.id}
                        view={view}
                        model={element}
                        disabled={isAlreadyOnDiagram || !hasAppropriateType}
                        selected={element.id === elementValue.value.id}
                        onClick={(e, model) => this.onSelectExistingItem(model)} />
                );
            });
        }
        return <span>No results</span>;
    }

    private async onSelectExistingItem(model: ElementModel) {
        const {editor, onChange} = this.props;

        this.loadingItemCancellation.abort();
        this.loadingItemCancellation = new AbortController();
        const signal = this.loadingItemCancellation.signal;

        onChange({value: model, isNew: false, loading: true});
        const result = await editor.model.dataProvider.elements({elementIds: [model.id]});
        if (signal.aborted) { return; }

        const loadedModel = result.get(model.id)!;
        onChange({value: loadedModel, isNew: false, loading: false});
    }

    render() {
        const {searchString} = this.state;
        return (
            <div className={`${CLASS_NAME}__form-row ${CLASS_NAME}__element-selector`}>
                <div className={`${CLASS_NAME}__search`}>
                    <span className={`${CLASS_NAME}__search-icon`} />
                    <input value={searchString}
                        onChange={e => this.setState({searchString: (e.target as HTMLInputElement).value})}
                        className={`reactodia-form-control ${CLASS_NAME}__search-input`}
                        placeholder='Search for...'
                        autoFocus />
                </div>
                {
                    searchString.length > 0 ? (
                        <div className={`${CLASS_NAME}__existing-elements-list`}>
                            {this.renderExistingElementsList()}
                        </div>
                    ) : (
                        <div>
                            <div className={`${CLASS_NAME}__separator`}>
                                <i className={`${CLASS_NAME}__separator-text`}>or create new entity</i>
                            </div>
                            {this.renderElementTypeSelector()}
                        </div>
                    )
                }
            </div>
        );
    }
}

function makeElementTypeComparatorByLabel(view: DiagramView) {
    return (a: ElementTypeIri, b: ElementTypeIri) => {
        const typeA = view.model.createClass(a);
        const typeB = view.model.createClass(b);
        const labelA = view.formatLabel(typeA.label, typeA.id);
        const labelB = view.formatLabel(typeB.label, typeB.id);
        return labelA.localeCompare(labelB);
    };
}

export function validateElementType(
    element: ElementModel
): Promise<Pick<ElementValue, 'error' | 'allowChange'>> {
    const isElementTypeSelected = element.types.indexOf(PLACEHOLDER_ELEMENT_TYPE) < 0;
    const error = !isElementTypeSelected ? 'Required.' : undefined;
    return Promise.resolve({error, allowChange: true});
}
