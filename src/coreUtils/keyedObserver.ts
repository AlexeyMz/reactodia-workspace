import { ElementTypeIri, LinkTypeIri, PropertyTypeIri } from '../data/model';

import { RichElementTypeEvents, RichLinkTypeEvents, RichPropertyEvents } from '../diagram/elements';
import { DiagramModel } from '../diagram/model';

import { Unsubscribe, Listener } from './events';

export class KeyedObserver<Key extends string> {
    private observedKeys = new Map<string, Unsubscribe>();

    constructor(readonly subscribe: (key: Key) => Unsubscribe | undefined) {}

    observe(keys: ReadonlyArray<Key>) {
        if (keys.length === 0 && this.observedKeys.size === 0) {
            return;
        }
        const newObservedKeys = new Map<string, Unsubscribe>();

        for (const key of keys) {
            if (newObservedKeys.has(key)) { continue; }
            let unsubscribe = this.observedKeys.get(key);
            if (!unsubscribe) {
                unsubscribe = this.subscribe(key);
            }
            if (unsubscribe) {
                newObservedKeys.set(key, unsubscribe);
            }
        }

        this.observedKeys.forEach((unsubscribe, key) => {
            if (!newObservedKeys.has(key)) {
                unsubscribe();
            }
        });

        this.observedKeys = newObservedKeys;
    }

    stopListening() {
        this.observe([]);
    }
}

export function observeElementTypes<Event extends keyof RichElementTypeEvents>(
    model: DiagramModel, event: Event, listener: Listener<RichElementTypeEvents, Event>
) {
    return new KeyedObserver<ElementTypeIri>(key => {
        const type = model.getElementType(key);
        if (type) {
            type.events.on(event, listener);
            return () => type.events.off(event, listener);
        }
        return undefined;
    });
}

export function observeProperties<Event extends keyof RichPropertyEvents>(
    model: DiagramModel, event: Event, listener: Listener<RichPropertyEvents, Event>
) {
    return new KeyedObserver<PropertyTypeIri>(key => {
        const property = model.getProperty(key);
        if (property) {
            property.events.on(event, listener);
            return () => property.events.off(event, listener);
        }
        return undefined;
    });
}

export function observeLinkTypes<Event extends keyof RichLinkTypeEvents>(
    model: DiagramModel, event: Event, listener: Listener<RichLinkTypeEvents, Event>
) {
    return new KeyedObserver<LinkTypeIri>(key => {
        const type = model.createLinkType(key);
        if (type) {
            type.events.on(event, listener);
            return () => type.events.off(event, listener);
        }
        return undefined;
    });
}
