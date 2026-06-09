# Description: This script removes all folders starting with "cassandra-" and "sql-".

# Base directory to search from (default is current directory)
BASE_DIR="."

# Confirm action
read -p "This will delete all directories starting with 'cassandra-' and 'sql-' in $BASE_DIR. Are you sure? (y/n): " confirm

if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo "Aborting operation."
    exit 1
fi

# Find and delete directories
for DIR in "$BASE_DIR"/{cassandra-*,sql-*}; do
    if [[ -d $DIR ]]; then
        echo "Deleting directory: $DIR"
        rm -rf "$DIR"
    else
        echo "No matching directories found for: $DIR"
    fi
done

echo "Operation completed."

