import jsHelper from 'algoliasearch-helper';
const SearchResults = jsHelper.SearchResults;

import connectSearchBox from '../connectSearchBox.js';

const fakeClient = { addAlgoliaAgent: () => {} };

describe('connectSearchBox', () => {
  it('Renders during init and render', () => {
    // test that the dummyRendering is called with the isFirstRendering
    // flag set accordingly
    const rendering = jest.fn();
    const makeWidget = connectSearchBox(rendering);

    const widget = makeWidget({
      foo: 'bar', // dummy param passed to `renderFn`
    });

    expect(widget.getConfiguration).toBe(undefined);

    const helper = jsHelper(fakeClient);
    helper.search = () => {};

    widget.init({
      helper,
      state: helper.state,
      createURL: () => '#',
      onHistoryChange: () => {},
    });

    // should call the rendering once with isFirstRendering to true
    expect(rendering).toHaveBeenCalledTimes(1);
    // should provide good values for the first rendering
    expect(rendering).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: helper.state.query,
        widgetParams: { foo: 'bar' },
      }),
      true
    );

    widget.render({
      results: new SearchResults(helper.state, [{}]),
      state: helper.state,
      helper,
      createURL: () => '#',
      searchMetadata: { isSearchStalled: false },
    });

    // Should call the rendering a second time, with isFirstRendering to false
    expect(rendering).toHaveBeenCalledTimes(2);
    // should provide good values after the first search
    expect(rendering).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: helper.state.query,
        widgetParams: { foo: 'bar' },
      }),
      false
    );
  });

  it('Provides a function to update the refinements at each step', () => {
    const rendering = jest.fn();
    const makeWidget = connectSearchBox(rendering);

    const widget = makeWidget();

    const helper = jsHelper(fakeClient);
    helper.search = jest.fn();

    widget.init({
      helper,
      state: helper.state,
      createURL: () => '#',
      onHistoryChange: () => {},
    });

    {
      // first rendering
      expect(helper.state.query).toBe('');
      const { refine } = rendering.mock.calls[0][0];
      refine('bip');
      expect(helper.state.query).toBe('bip');
      expect(helper.search).toHaveBeenCalledTimes(1);
    }

    widget.render({
      results: new SearchResults(helper.state, [{}]),
      state: helper.state,
      helper,
      createURL: () => '#',
      searchMetadata: { isSearchStalled: false },
    });

    {
      // Second rendering
      expect(helper.state.query).toBe('bip');
      const { refine, query } = rendering.mock.calls[1][0];
      expect(query).toBe('bip');
      refine('bop');
      expect(helper.state.query).toBe('bop');
      expect(helper.search).toHaveBeenCalledTimes(2);
    }
  });

  it('provides a function to clear the query and perform new search', () => {
    const rendering = jest.fn();
    const makeWidget = connectSearchBox(rendering);

    const widget = makeWidget();

    const helper = jsHelper(fakeClient, '', {
      query: 'bup',
    });
    helper.search = jest.fn();

    widget.init({
      helper,
      state: helper.state,
      createURL: () => '#',
      onHistoryChange: () => {},
    });

    {
      // first rendering
      expect(helper.state.query).toBe('bup');
      const { refine, clear } = rendering.mock.calls[0][0];
      clear(); // triggers a search
      expect(helper.state.query).toBe('');
      expect(helper.search).toHaveBeenCalledTimes(1);
      refine('bip'); // triggers a search
    }

    widget.render({
      results: new SearchResults(helper.state, [{}]),
      state: helper.state,
      helper,
      createURL: () => '#',
      searchMetadata: { isSearchStalled: false },
    });

    {
      // Second rendering
      expect(helper.state.query).toBe('bip');
      const { clear } = rendering.mock.calls[1][0];
      clear(); // triggers a search
      expect(helper.state.query).toBe('');
      // refine and clear functions trigger searches. clear + refine + clear
      expect(helper.search).toHaveBeenCalledTimes(3);
    }
  });

  it('queryHook parameter let the dev control the behavior of the search', () => {
    const rendering = jest.fn();
    const makeWidget = connectSearchBox(rendering);

    // letSearchThrough will control if the provided function should be called
    let letSearchThrough = false;
    const queryHook = jest.fn((q, search) => {
      if (letSearchThrough) search(q);
    });

    const widget = makeWidget({
      queryHook,
    });

    const helper = jsHelper(fakeClient);
    helper.search = jest.fn();

    widget.init({
      helper,
      state: helper.state,
      createURL: () => '#',
      onHistoryChange: () => {},
    });

    {
      // first rendering
      const { refine } = rendering.mock.calls[0][0];

      refine('bip');
      expect(queryHook).toHaveBeenCalledTimes(1);
      expect(helper.state.query).toBe('');
      expect(helper.search).not.toHaveBeenCalled();

      letSearchThrough = true;
      refine('bip');
      expect(queryHook).toHaveBeenCalledTimes(2);
      expect(helper.state.query).toBe('bip');
      expect(helper.search).toHaveBeenCalledTimes(1);
    }

    // reset the hook behavior
    letSearchThrough = false;

    widget.render({
      results: new SearchResults(helper.state, [{}]),
      state: helper.state,
      helper,
      createURL: () => '#',
      searchMetadata: { isSearchStalled: false },
    });

    {
      // Second rendering
      const { refine } = rendering.mock.calls[1][0];

      refine('bop');
      expect(queryHook).toHaveBeenCalledTimes(3);
      expect(helper.state.query).toBe('bip');
      expect(helper.search).toHaveBeenCalledTimes(1);

      letSearchThrough = true;
      refine('bop');
      expect(queryHook).toHaveBeenCalledTimes(4);
      expect(helper.state.query).toBe('bop');
      expect(helper.search).toHaveBeenCalledTimes(2);
    }
  });

  it('should always provide the same refine() and clear() function reference', () => {
    const rendering = jest.fn();
    const makeWidget = connectSearchBox(rendering);

    const widget = makeWidget();

    const helper = jsHelper(fakeClient);
    helper.search = () => {};

    widget.init({
      helper,
      state: helper.state,
      createURL: () => '#',
      onHistoryChange: () => {},
    });

    widget.render({
      results: new SearchResults(helper.state, [{}]),
      state: helper.state,
      helper,
      createURL: () => '#',
      searchMetadata: { isSearchStalled: false },
    });

    const firstRenderOptions = rendering.mock.calls[0][0];

    widget.render({
      results: new SearchResults(helper.state, [{}]),
      state: helper.state,
      helper,
      createURL: () => '#',
      searchMetadata: { isSearchStalled: false },
    });

    const secondRenderOptions = rendering.mock.calls[1][0];

    expect(firstRenderOptions.clear).toBe(secondRenderOptions.clear);
    expect(firstRenderOptions.refine).toBe(secondRenderOptions.refine);
  });

  it('should clear on init as well', () => {
    const rendering = jest.fn();
    const makeWidget = connectSearchBox(rendering);

    const widget = makeWidget();

    const helper = jsHelper(fakeClient);
    helper.search = jest.fn();
    helper.setQuery('foobar');

    expect(helper.state.query).toBe('foobar');

    widget.init({
      helper,
      state: helper.state,
      createURL: () => '#',
      onHistoryChange: () => {},
    });

    const { clear } = rendering.mock.calls[0][0];
    clear();

    expect(helper.state.query).toBe('');
    expect(helper.search).toHaveBeenCalledTimes(1);
  });
});
