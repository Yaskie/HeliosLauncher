const {ipcRenderer} = require('electron')
const fs            = require('fs-extra')
const os            = require('os')
const path          = require('path')

const ConfigManager = require('./configmanager')
const DistroManager = require('./distromanager')
const LangLoader    = require('./langloader')
const logger        = require('./loggerutil')('%c[Preloader]', 'color: #a02d2a; font-weight: bold')

logger.log('Loading..')

// Load ConfigManager
ConfigManager.load()

// Load Strings
LangLoader.loadLanguage('en_US')

function onDistroLoad(data){
    if(data != null){
        
        // Resolve the selected server if its value has yet to be set.
        if(ConfigManager.getSelectedServer() == null || data.getServer(ConfigManager.getSelectedServer()) == null){
            logger.log('Sélection du serveur par défaut...')
            ConfigManager.setSelectedServer(data.getMainServer().getID())
            ConfigManager.save()
        }
    }
    ipcRenderer.send('distributionIndexDone', data != null)
}

// Ensure Distribution is downloaded and cached.
DistroManager.pullRemote().then((data) => {
    logger.log('L\'index a bien été chagé.')

    onDistroLoad(data)

}).catch((err) => {
    logger.log('Erreur lors du chargement de l\'index.')
    logger.error(err)

    logger.log('Tentative de charger une ancienne version de l\'index...')
    // Try getting a local copy, better than nothing.
    DistroManager.pullLocal().then((data) => {
        logger.log('Une ancienne version de l\'index a bien été chargée.')

        onDistroLoad(data)


    }).catch((err) => {

        logger.log('Erreur lors du chargement d\'une ancienne version de l\'index.')
        logger.log('L\'application ne peut pas tourner.')
        logger.error(err)

        onDistroLoad(null)

    })

})

// Clean up temp dir incase previous launches ended unexpectedly. 
fs.remove(path.join(os.tmpdir(), ConfigManager.getTempNativeFolder()), (err) => {
    if(err){
        logger.warn('Erreur lors du vidage du cache', err)
    } else {
        logger.log('Le cache a été vidé.')
    }
})