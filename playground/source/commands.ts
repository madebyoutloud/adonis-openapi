import { ListLoader } from '@adonisjs/core/ace'
import GenerateCommand from '../../packages/openapi/commands/generate.ts'

/**
 * Replaces the commands index generated during the package build.
 */
const loader = new ListLoader([GenerateCommand])

export const getMetaData = loader.getMetaData.bind(loader)
export const getCommand = loader.getCommand.bind(loader)
