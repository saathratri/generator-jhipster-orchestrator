import { describe, expect, it } from 'vitest';

import { stripExcludedFromFormServiceSpec, stripExcludedFromUpdateSpec } from './excluded-relationship-spec-strip.js';

// The shape upstream's _entityFile_-update.spec.ts.ejs writes (taken from the generated Blog spec, where
// hiddenTags -> Tag is excluded from the form by @customQueryAnnotation and the component no longer has
// tagsSharedCollection / compareTag - which made the spec fail to compile).
const UPDATE_SPEC = `import { ITag } from 'app/entities/psqlblog/tag/tag.model';
import { TagService } from 'app/entities/psqlblog/tag/service/tag.service';
import { IAuthor } from 'app/entities/psqlblog/author/author.model';
import { AuthorService } from 'app/entities/psqlblog/author/service/author.service';

describe('Blog Management Update Component', () => {
  let tagService: TagService;
  let authorService: AuthorService;

  beforeEach(() => {
    tagService = TestBed.inject(TagService);
    authorService = TestBed.inject(AuthorService);
  });

  describe('ngOnInit', () => {
    it('should call Tag query and add missing value', () => {
      const blog: IBlog = { id: '87061d20-94fb-444d-b228-1e873ee23691' };
      const hiddenTags: ITag[] = [{ id: 'fccf11f7-45ef-44e6-9532-2ed5cedcf2ec' }];
      blog.hiddenTags = hiddenTags;
      vi.spyOn(tagService, 'query').mockReturnValue(of(new HttpResponse({ body: tagCollection })));
      expect(tagService.addTagToCollectionIfMissing).toHaveBeenCalledWith(
        tagCollection,
        ...additionalTags.map(i => expect.objectContaining(i) as typeof i),
      );
      expect(comp.tagsSharedCollection()).toEqual(expectedCollection);
    });

    it('should call Author query and add missing value', () => {
      expect(comp.authorsSharedCollection()).toEqual(expectedCollection);
    });

    it('should update editForm', () => {
      const blog: IBlog = { id: '87061d20-94fb-444d-b228-1e873ee23691' };
      const hiddenTag: ITag = { id: 'fccf11f7-45ef-44e6-9532-2ed5cedcf2ec' };
      blog.hiddenTags = [hiddenTag];
      const user: IAuthor = { id: 'a30298cf-223f-4185-9984-7ec30e626f17' };
      blog.users = [user];

      expect(comp.tagsSharedCollection()).toContainEqual(hiddenTag);
      expect(comp.authorsSharedCollection()).toContainEqual(user);
    });
  });

  describe('Compare relationships', () => {
    describe('compareTag', () => {
      it('should forward to tagService', () => {
        vi.spyOn(tagService, 'compareTag');
        comp.compareTag(entity, entity2);
        expect(tagService.compareTag).toHaveBeenCalledWith(entity, entity2);
      });
    });

    describe('compareAuthor', () => {
      it('should forward to authorService', () => {
        comp.compareAuthor(entity, entity2);
      });
    });
  });
});
`;

const HIDDEN_TAGS = {
  otherEntityAngularName: 'Tag',
  otherEntityInstancePlural: 'tags',
  propertyName: 'hiddenTags',
  relationshipFieldName: 'hiddenTag',
};

describe('stripExcludedFromUpdateSpec', () => {
  const out = stripExcludedFromUpdateSpec(UPDATE_SPEC, { entityInstance: 'blog', rels: [HIDDEN_TAGS] });

  it('leaves no reference to what the component no longer has', () => {
    expect(out).not.toMatch(/tag/i);
  });

  it('keeps every kept relationship intact', () => {
    expect(out).toContain("import { AuthorService } from 'app/entities/psqlblog/author/service/author.service';");
    expect(out).toContain('authorService = TestBed.inject(AuthorService);');
    expect(out).toContain("it('should call Author query and add missing value', () => {");
    expect(out).toContain('blog.users = [user];');
    expect(out).toContain('expect(comp.authorsSharedCollection()).toContainEqual(user);');
    expect(out).toContain("describe('compareAuthor', () => {");
  });

  it('keeps the brackets balanced', () => {
    const count = ch => out.split(ch).length - 1;
    expect(count('(')).toBe(count(')'));
    expect(count('{')).toBe(count('}'));
    expect(count('[')).toBe(count(']'));
  });

  it('is a no-op with nothing excluded', () => {
    expect(stripExcludedFromUpdateSpec(UPDATE_SPEC, { entityInstance: 'blog', rels: [] })).toBe(UPDATE_SPEC);
  });
});

describe('stripExcludedFromFormServiceSpec', () => {
  const FORM_SPEC = `        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            customers: expect.any(Object),
            hiddenTags: expect.any(Object),
            users: expect.any(Object),
          }),
        );
`;

  it('drops the excluded form controls and nothing else', () => {
    const out = stripExcludedFromFormServiceSpec(FORM_SPEC, ['hiddenTags', 'customers']);
    expect(out).not.toMatch(/hiddenTags|customers/);
    expect(out).toContain('id: expect.any(Object),');
    expect(out).toContain('users: expect.any(Object),');
  });
});
