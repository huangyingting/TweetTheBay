/* globals jest */

import CurrentTweetReducer from '../../reducers/current_tweet_reducer';

describe('Reducers', () => {
  describe('CurrentTweetReducer', () => {
    // eslint-disable-next-line no-underscore-dangle
    const _oldState = { id: 2 };

    it('exports an function', () => {
      expect(typeof CurrentTweetReducer).toEqual('function');
    });

    it('should initialize with null as the default state', () => {
      expect(CurrentTweetReducer(undefined, {})).toEqual(null);
    });

    it('should return the previous state if an action is not matched', () => {
      const newState = CurrentTweetReducer(_oldState, { type: 'notAType' });
      expect(newState).toEqual(_oldState);
    });

    describe('handling the SET_CURRENT_TWEET action', () => {
      let currentTweet;
      let setCurrentTweetAction;

      beforeEach(() => {
        currentTweet = { id: 1 };

        setCurrentTweetAction = {
          type: 'SET_CURRENT_TWEET',
          tweet: currentTweet,
        };
      });

      it("should replace the state with the action's tweet", () => {
        const state = CurrentTweetReducer(undefined, setCurrentTweetAction);
        expect(state).toEqual(currentTweet);
      });

      it('should not modify the old state', () => {
        const oldState = { id: 2 };

        CurrentTweetReducer(oldState, setCurrentTweetAction);
        expect(oldState).toEqual(_oldState);
      });
    });
  });
});
