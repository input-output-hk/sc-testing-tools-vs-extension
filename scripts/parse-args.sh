parse_script_args() {
  local mode=$1
  shift

  PROJECT_PATH=''
  PACKAGE_NAME=''
  TEST_SUITE_NAME=''
  TEST_IDS=''
  ROUNDS=''

  while (( $# > 0 )); do
    case "$1" in
      --project-path|--package|--suite|--test-id|--round)
        if (( $# < 2 )) || [[ -z $2 || $2 == --* ]]; then
          printf 'Missing value for %s\n' "$1" >&2
          return 2
        fi
        if [[ $mode == list && ( $1 == --test-id || $1 == --round ) ]]; then
          printf 'Unknown option for list: %s\n' "$1" >&2
          return 2
        fi
        case "$1" in
          --project-path) PROJECT_PATH=$2 ;;
          --package) PACKAGE_NAME=$2 ;;
          --suite) TEST_SUITE_NAME=$2 ;;
          --test-id) TEST_IDS=$2 ;;
          --round) ROUNDS=$2 ;;
        esac
        shift 2
        ;;
      *)
        printf 'Unknown option: %s\n' "$1" >&2
        return 2
        ;;
    esac
  done

  if [[ -z $PROJECT_PATH ]]; then
    printf 'Missing required option: --project-path\n' >&2
    return 2
  fi
  if [[ -z $PACKAGE_NAME ]]; then
    printf 'Missing required option: --package\n' >&2
    return 2
  fi
  if [[ -z $TEST_SUITE_NAME ]]; then
    printf 'Missing required option: --suite\n' >&2
    return 2
  fi
}