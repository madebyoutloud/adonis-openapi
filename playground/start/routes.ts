/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| Every route here is a generator test case, the generated document is
| snapshotted in tests/openapi.spec.ts.
|
*/

import router from '@adonisjs/core/services/router'

const UsersController = () => import('#controllers/users_controller')
const PostsController = () => import('#controllers/posts_controller')
const FilesController = () => import('#controllers/files_controller')
const TypesController = () => import('#controllers/types_controller')

// Unnamed closure route, not part of the Tuyau registry, documented thanks to its metadata
router.get('/health', () => ({ status: 'ok' }))
  .openapi({ summary: 'Health check' })

router.group(() => {
  router.get('/users', [UsersController, 'index']).openapi({ summary: 'List users' })
  router.post('/users', [UsersController, 'store']).openapi({ summary: 'Create user' })
  router.get('/users/:id', [UsersController, 'show']).openapi({ summary: 'Get user' })
  router.delete('/users/:id', [UsersController, 'destroy']).openapi({ summary: 'Delete user' })
  router.get('/users/:id/posts/:postId?', [PostsController, 'forUser'])
})
  .prefix('/api')
  .openapi({ tags: ['Users'] })

router.group(() => {
  router.resource('posts', PostsController)
    .apiOnly()
    .openapi({
      tags: ['Posts'],
      security: [{ bearer: [] }],
      index: { summary: 'List posts' },
      show: { summary: 'Get post' },
      store: { summary: 'Create post' },
      update: { summary: 'Update post' },
      destroy: { summary: 'Delete post', deprecated: true },
    })

  router.get('/posts/:id/comments', [PostsController, 'comments'])
    .openapi({ summary: 'List post comments', tags: ['Posts'] })
}).prefix('/api')

router.post('/api/files', [FilesController, 'upload'])
  .openapi({ summary: 'Upload file', tags: ['Files'] })

router.group(() => {
  router.get('/primitives', [TypesController, 'primitives'])
  router.get('/optional', [TypesController, 'optional'])
  router.get('/collections', [TypesController, 'collections'])
  router.get('/unions', [TypesController, 'unions'])
  router.get('/intersection', [TypesController, 'intersection'])
  router.get('/overrides', [TypesController, 'overrides'])
  router.get('/custom', [TypesController, 'custom'])
  router.get('/generic', [TypesController, 'generic'])
  router.get('/generic-types', [TypesController, 'genericTypes'])
})
  .prefix('/types')
  .openapi({ tags: ['Types'] })
