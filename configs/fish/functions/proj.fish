# Project launcher: manage project dirs and their facets (Obsidian / backlog).
# Registry: ~/.config/projects.tsv  (name<TAB>port<TAB>path ; '#' comments)
#
#   proj                 list projects + running portless routes
#   proj ls              same as above
#   proj path <name>     print the project dir path (for: cd (proj path <name>))
#   proj bl <name>       serve the project's backlog at https://<name>.localhost
function proj --description 'Project launcher (path / backlog)'
    set -l registry $HOME/.config/projects.tsv

    if not test -f $registry
        echo "proj: registry not found: $registry" >&2
        return 1
    end

    set -l cmd $argv[1]
    set -l name $argv[2]

    switch "$cmd"
        case '' ls list
            echo "Projects ($registry):"
            printf '  %-14s %-6s %s\n' name port path
            while read -l line
                string match -q '#*' -- $line; and continue
                test -z "$line"; and continue
                set -l c (string split \t -- $line)
                printf '  %-14s %-6s %s\n' $c[1] $c[2] $c[3]
            end <$registry
            echo
            echo "Running portless routes:"
            portless list
            return 0
    end

    if test -z "$name"
        echo "proj: '$cmd' needs a project name. Run 'proj' to list projects." >&2
        return 1
    end

    # Resolve name → port, path.
    set -l port ""
    set -l path ""
    while read -l line
        string match -q '#*' -- $line; and continue
        test -z "$line"; and continue
        set -l c (string split \t -- $line)
        if test "$c[1]" = "$name"
            set port $c[2]
            set path $c[3]
            break
        end
    end <$registry

    if test -z "$path"
        echo "proj: unknown project '$name'. Run 'proj' to list projects." >&2
        return 1
    end
    if not test -d "$path"
        echo "proj: path not found for '$name': $path" >&2
        return 1
    end

    switch "$cmd"
        case path
            echo "$path"
        case bl backlog
            # Static portless route (idempotent); backlog ignores $PORT so bind a fixed port.
            portless alias $name $port >/dev/null
            cd "$path"; or return 1
            echo "proj: serving '$name' → https://$name.localhost (port $port)"
            backlog browser --no-open -p $port
        case '*'
            echo "proj: unknown subcommand '$cmd'. Use: ls | path | bl" >&2
            return 1
    end
end
