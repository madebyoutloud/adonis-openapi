---
title: Docs
---

::u-page-hero
#title
{{ site.name }}

#description
{{ package.description }}

#links
  :::u-button
  ---
  color: neutral
  size: xl
  to: /getting-started/introduction
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button{:to="package.repository.url"}
  ---
  color: neutral
  icon: simple-icons-github
  size: xl
  variant: outline
  target: _blank
  ---
  View on Github
  :::
::
