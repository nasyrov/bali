import { describe, expect, it } from 'vitest';
import {
  isDrivable,
  isDropped,
  isPath,
  roadClassOf,
  roadColour,
  roadSurface,
  roadHeight,
  roadWidth,
} from './roads.ts';

describe('roadClassOf', () => {
  it('recognises the classes Bali actually tags its roads with', () => {
    expect(roadClassOf('trunk')).toBe('trunk');
    expect(roadClassOf('living_street')).toBe('living_street');
    expect(roadClassOf('tertiary_link')).toBe('tertiary_link');
  });

  it('is undefined for a highway value the world does not render', () => {
    expect(roadClassOf('bus_stop')).toBeUndefined();
    expect(roadClassOf(undefined)).toBeUndefined();
  });
});

describe('isDropped', () => {
  it('drops ways that are not roads yet or never will be', () => {
    for (const value of ['proposed', 'construction', 'raceway']) {
      expect(isDropped(value)).toBe(true);
    }
  });

  it('keeps the classes the island is built from', () => {
    for (const value of ['trunk', 'residential', 'living_street', 'path', 'steps']) {
      expect(isDropped(value)).toBe(false);
    }
  });
});

describe('isPath and isDrivable', () => {
  // Traffic drives only on Roads; a Path is rendered but never joins the graph.
  it('keeps tracks in the road graph and paths out of it', () => {
    expect(isPath('track')).toBe(false);
    expect(isDrivable('track')).toBe(true);

    for (const path of ['path', 'footway', 'steps', 'pedestrian', 'cycleway'] as const) {
      expect(isPath(path)).toBe(true);
      expect(isDrivable(path)).toBe(false);
    }
  });
});

describe('roadWidth', () => {
  it('uses the Bali-calibrated default for the class when there is no width tag', () => {
    expect(roadWidth('trunk', undefined)).toBe(8);
    expect(roadWidth('secondary', undefined)).toBe(5.5);
    expect(roadWidth('residential', undefined)).toBe(3.5);
    expect(roadWidth('living_street', undefined)).toBe(2.2);
  });

  it('takes the OSM width tag when it is between 1 and 12 metres', () => {
    expect(roadWidth('secondary', '5')).toBe(5);
    expect(roadWidth('living_street', '1.5')).toBe(1.5);
    expect(roadWidth('residential', '12')).toBe(12);
  });

  // Width is tagged almost exclusively on narrow gangs, so an implausible value is
  // far more likely to be a mistake than a real measurement.
  it('falls back to the class default for an implausible or unreadable tag', () => {
    expect(roadWidth('residential', '0.4')).toBe(3.5);
    expect(roadWidth('residential', '40')).toBe(3.5);
    expect(roadWidth('residential', 'wide')).toBe(3.5);
    expect(roadWidth('residential', '')).toBe(3.5);
  });

  it('reads a width tagged in metres', () => {
    expect(roadWidth('secondary', '5 m')).toBe(5);
  });

  it('gives a link a narrower default than the road it leaves', () => {
    expect(roadWidth('trunk_link', undefined)).toBeLessThan(roadWidth('trunk', undefined));
  });
});

describe('roadSurface', () => {
  it('takes the surface tag when the world knows that surface', () => {
    expect(roadSurface('residential', 'asphalt')).toBe('asphalt');
    expect(roadSurface('living_street', 'paving_stones')).toBe('paving_stones');
  });

  it('falls back to the class when the tag is missing or nobody mapped it', () => {
    expect(roadSurface('trunk', undefined)).toBe('asphalt');
    expect(roadSurface('residential', 'sett')).toBe('paving_stones');
    expect(roadSurface('track', undefined)).toBe('unpaved');
  });
});

describe('roadColour', () => {
  it('colours by the surface tag when there is one', () => {
    expect(roadColour('residential', 'asphalt')).toBe(roadColour('trunk', 'asphalt'));
    expect(roadColour('trunk', 'paving_stones')).toBe(roadColour('living_street', undefined));
  });

  it('falls back to asphalt on the main classes, paving stones on gangs, unpaved on tracks and paths', () => {
    expect(roadColour('trunk', undefined)).toBe(roadColour('trunk', 'asphalt'));
    expect(roadColour('unclassified', undefined)).toBe(roadColour('trunk', 'asphalt'));
    expect(roadColour('residential', undefined)).toBe(roadColour('trunk', 'paving_stones'));
    expect(roadColour('service', undefined)).toBe(roadColour('trunk', 'paving_stones'));
    expect(roadColour('track', undefined)).toBe(roadColour('trunk', 'unpaved'));
    expect(roadColour('path', undefined)).toBe(roadColour('trunk', 'unpaved'));
  });

  it('falls back to the class when the surface tag is one nobody mapped a colour for', () => {
    expect(roadColour('residential', 'sett')).toBe(roadColour('residential', undefined));
  });
});

describe('roadHeight', () => {
  it('draws a higher class above a lower one, by millimetres', () => {
    expect(roadHeight('trunk')).toBeGreaterThan(roadHeight('residential'));
    expect(roadHeight('residential')).toBeGreaterThan(roadHeight('path'));
    expect(roadHeight('motorway') - roadHeight('steps')).toBeLessThan(0.1);
  });

  it('keeps every road above the ground plane', () => {
    for (const cls of ['motorway', 'residential', 'steps'] as const) {
      expect(roadHeight(cls)).toBeGreaterThan(0);
    }
  });

  it('gives a link the height of the class it leaves', () => {
    expect(roadHeight('trunk_link')).toBe(roadHeight('trunk'));
  });
});
