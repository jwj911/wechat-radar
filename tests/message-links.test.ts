import { describe, it, expect } from 'vitest';
import {
  decodeHtmlEntities,
  cleanUrl,
  normalizeUrl,
  domainOf,
  extractMessageLinks,
} from '../lib/message-links';

describe('decodeHtmlEntities', () => {
  it('decodes named entities', () => {
    expect(decodeHtmlEntities('a &amp; b')).toBe('a & b');
    expect(decodeHtmlEntities('&lt;tag&gt;')).toBe('<tag>');
    expect(decodeHtmlEntities('say &quot;hi&quot;')).toBe('say "hi"');
    expect(decodeHtmlEntities('it&#39;s')).toBe("it's");
  });

  it('decodes hex and decimal numeric entities', () => {
    expect(decodeHtmlEntities('&#x4e2d;')).toBe('中');
    expect(decodeHtmlEntities('&#20013;')).toBe('中');
  });
});

describe('cleanUrl', () => {
  it('strips a trailing closing paren', () => {
    expect(cleanUrl('https://a.com/x)')).toBe('https://a.com/x');
  });

  it('strips trailing CJK / ASCII punctuation', () => {
    expect(cleanUrl('https://a.com/x）。')).toBe('https://a.com/x）');
    expect(cleanUrl('https://a.com/x，')).toBe('https://a.com/x');
    expect(cleanUrl('https://a.com/x;')).toBe('https://a.com/x');
  });

  it("strips a trailing '...' ellipsis run", () => {
    expect(cleanUrl('https://a.com/x...')).toBe('https://a.com/x');
    expect(cleanUrl('https://a.com/x.....')).toBe('https://a.com/x');
  });

  it('decodes HTML entities inside the url', () => {
    expect(cleanUrl('https://a.com/p?a=1&amp;b=2')).toBe('https://a.com/p?a=1&b=2');
  });

  it('does NOT strip a lone trailing ASCII period (period not in the char class)', () => {
    // The trailing-punctuation class excludes '.', and a single trailing '.'
    // is not a 3+ run, so the string is returned unchanged. A trailing ')'
    // preceded by '.' also survives because '.' blocks the anchor to end.
    expect(cleanUrl('https://a.com/x).')).toBe('https://a.com/x).');
  });
});

describe('normalizeUrl', () => {
  it('removes utm_* params and the hash fragment', () => {
    expect(normalizeUrl('https://a.com/p?utm_source=x&id=1#frag')).toBe('https://a.com/p?id=1');
  });

  it('returns null for input containing an ellipsis', () => {
    expect(normalizeUrl('https://a.com/x...')).toBeNull();
    expect(normalizeUrl('https://a.com/x…')).toBeNull();
  });

  it('returns null for non-URL garbage', () => {
    expect(normalizeUrl('not a url')).toBeNull();
    expect(normalizeUrl('')).toBeNull();
  });
});

describe('domainOf', () => {
  it('returns the hostname without the leading www.', () => {
    expect(domainOf('https://www.example.com/p')).toBe('example.com');
    expect(domainOf('https://mp.weixin.qq.com/s/abc')).toBe('mp.weixin.qq.com');
  });

  it('returns an empty string for an invalid url', () => {
    expect(domainOf('garbage')).toBe('');
  });
});

describe('extractMessageLinks', () => {
  it('(a) extracts a WeChat article URL from plain text', () => {
    const content = 'Check this out https://mp.weixin.qq.com/s/abcDEF123 great read';
    const links = extractMessageLinks(content);
    expect(links).toHaveLength(1);
    const [link] = links;
    expect(link.canonical_url).toBe('https://mp.weixin.qq.com/s/abcDEF123');
    expect(link.domain).toBe('mp.weixin.qq.com');
    // No XML wrapper, so the free-text match yields source 'plain_url'...
    expect(link.source).toBe('plain_url');
    // ...but it is still a recognized wechat article, so confidence is 0.96.
    expect(link.confidence).toBe(0.96);
    expect(link.raw_kind).toBe('plain_url');
  });

  it('(b) extracts a link from an appmsg XML string using the xml title', () => {
    const content =
      '<msg><appmsg appid="wx123"><title>Hello Article Title</title>' +
      '<des>Some description</des>' +
      '<url>https://mp.weixin.qq.com/s/abc</url></appmsg></msg>';
    const links = extractMessageLinks(content);
    expect(links).toHaveLength(1);
    const [link] = links;
    expect(link.canonical_url).toBe('https://mp.weixin.qq.com/s/abc');
    expect(link.domain).toBe('mp.weixin.qq.com');
    expect(link.source).toBe('wechat_raw');
    expect(link.title).toBe('Hello Article Title');
    expect(link.description).toBe('Some description');
    expect(link.confidence).toBe(1);
    expect(link.raw_kind).toBe('appmsg_url');
  });

  it('extracts a generic (non-wechat) URL as a plain_url with 0.9 confidence', () => {
    const links = extractMessageLinks('see https://example.com/article here');
    expect(links).toHaveLength(1);
    const [link] = links;
    expect(link.canonical_url).toBe('https://example.com/article');
    expect(link.domain).toBe('example.com');
    expect(link.source).toBe('plain_url');
    expect(link.confidence).toBe(0.9);
  });

  it('returns an empty array when there is no URL', () => {
    expect(extractMessageLinks('just some text with no links')).toEqual([]);
  });
});
