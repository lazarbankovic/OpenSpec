workspace "System Context" "C1 - System Context diagram" {

    model {
        # Define people and software systems here
        # Example:
        # user = person "User" "A user of the system"
        # softwareSystem = softwareSystem "Software System" "Description"
        # user -> softwareSystem "Uses"
    }

    views {
        systemContext softwareSystem "SystemContext" {
            include *
            autoLayout
        }

        theme default
    }

}
