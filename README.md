# AdonisJS OpenAPI

OpenAPI generator for [AdonisJS](https://adonisjs.com/) 7.

<p>

[![typescript-image]][typescript-url]
[![npm-image]][npm-url]
[![npm-download-image]][npm-download-url]
[![license-image]][license-url]

</p>

## Documentation
To learn more, check [documentation](https://docs.outloud.dev/openapi/).

## Development
`playground/` is an AdonisJS app using both packages, every route in it is a generator test case. Its generated document is snapshotted in `playground/tests/__snapshots__/openapi.json`.

The playground runs the packages from their TypeScript sources (see `playground/source/hooks.ts`), no build is needed. In CI (`CI` env variable is set) the hooks are disabled and the tests run against the built packages, build them first with `pnpm build`. Use `pnpm build && CI=1 pnpm test` to check it locally before a release.

```bash
pnpm test                       # run all tests
pnpm --filter playground test   # rerun snapshot test on package or playground change
```

Review the snapshot diff after changing the generator and accept it with `vitest -u`. To browse the docs UI, run `pnpm setup && pnpm dev` inside `playground/` and open `/docs`.

---


[npm-image]: https://badgen.net/npm/v/@outloud/adonis-openapi/latest
[npm-url]: https://npmjs.org/package/@outloud/adonis-openapi "npm"

[npm-download-image]: https://badgen.net/npm/dm/@outloud/adonis-openapi
[npm-download-url]: https://npmcharts.com/compare/@outloud/adonis-openapi?minimal=true "downloads"

[typescript-image]: https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org "TypeScript"

[license-image]: https://img.shields.io/npm/l/@outloud/adonis-openapi.svg?sanitize=true
[license-url]: LICENSE.md "license"
