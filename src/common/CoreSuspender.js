// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useCore } = require('stremio/core');

const CoreSuspenderContext = React.createContext(null);

CoreSuspenderContext.displayName = 'CoreSuspenderContext';

const DEFAULT_STATES = {
    meta_details: {
        selected: null,
        metaItem: null,
        libraryItem: null,
        streams: [],
        title: null,
        ratingInfo: null
    },
    player: {
        selected: null,
        metaItem: null,
        streamState: null,
        seriesInfo: null,
        libraryItem: null,
        nextVideo: null,
        subtitles: [],
        audioTracks: []
    }
};

const sharedStates = {
    meta_details: {
        read() {
            return DEFAULT_STATES.meta_details;
        }
    },
    player: {
        read() {
            return DEFAULT_STATES.player;
        }
    }
};

function wrapPromise(promise, label = 'unknown') {
    let status = 'pending';
    let result;
    const suspender = promise.then(
        (resp) => {
            status = 'success';
            result = resp;
            
        },
        (error) => {
            status = 'error';
            result = error;
            
        }
    );
    return {
        read() {
            if (status === 'pending') {
                
                throw suspender;
            } else if (status === 'error') {
                
                throw result;
            } else if (status === 'success') {
                
                return result;
            }
        }
    };
}

const useCoreSuspender = () => {
    return React.useContext(CoreSuspenderContext);
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const withCoreSuspender = (Component, Fallback = () => { }) => {
    const compName = Component.displayName || Component.name || 'Anonymous';
    return function CoreSuspender(props) {
        const core = useCore();

        const getState = React.useCallback((model) => {
            if (!sharedStates[model]) {
                
                sharedStates[model] = wrapPromise(core.transport.getState(model), model);
            }

            return sharedStates[model].read();
        }, [core]);

        const decodeStream = React.useCallback(() => {
            return null;
        }, []);

        const suspender = React.useMemo(() => ({ getState, decodeStream }), [getState, decodeStream]);

        return (
            <React.Suspense fallback={<Fallback {...props} />}>
                <CoreSuspenderContext.Provider value={suspender}>
                    <Component {...props} />
                </CoreSuspenderContext.Provider>
            </React.Suspense>
        );
    };
};

module.exports = { withCoreSuspender, useCoreSuspender };
