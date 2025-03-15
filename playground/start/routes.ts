import router from '@adonisjs/core/services/router'
import openapi from '@outloud/adonis-openapi/services/main'

const DemoController = () => import('#controllers/demo_controller')
const PostsController = () => import('#controllers/posts_controller')

router.group(() => {
  router.get('/users/:id', [DemoController, 'index'])
    .where('id', router.matchers.number())
  router.get('/users', [DemoController, 'index'])
  router.resource('posts', PostsController)
  .where('id', router.matchers.uuid())
})

openapi.registerRoutes()
