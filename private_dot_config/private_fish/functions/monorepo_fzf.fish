function monorepo_fzf --description "Navigate to monorepo packages using fzf"
    # 現在のパスを取得
    set -l current_path (pwd)
    set -l packages_dir

    # ケース1: 現在のパスに "packages" が含まれている場合
    if string match -q "*packages*" $current_path
        # packages ディレクトリまでのパスを抽出
        set -l path_parts (string split "/" $current_path)
        set -l packages_index
        
        for i in (seq (count $path_parts))
            if test $path_parts[$i] = "packages"
                set packages_index $i
                break
            end
        end
        
        if test -n "$packages_index"
            set packages_dir (string join "/" $path_parts[1..$packages_index])
        end
    # ケース2: 現在のディレクトリ下に packages ディレクトリがある場合
    else if test -d "packages"
        set packages_dir "$current_path/packages"
    end

    # packages ディレクトリが見つからない場合
    if test -z "$packages_dir"
        echo "No packages directory found in current path or subdirectory"
        return 1
    end

    # packages 直下のディレクトリを取得
    set -l package_dirs
    for dir in $packages_dir/*/
        if test -d $dir
            set -a package_dirs (basename $dir)
        end
    end

    # ディレクトリが見つからない場合
    if test (count $package_dirs) -eq 0
        echo "No directories found under $packages_dir"
        return 1
    end

    # fzf で選択
    set -l selected (printf '%s\n' $package_dirs | fzf \
        --prompt="Select package: " \
        --height=40% \
        --layout=reverse \
        --border \
        --preview="ls -la $packages_dir/{}" \
        --preview-window=right:50%)

    # 選択されたディレクトリに移動
    if test -n "$selected"
        cd "$packages_dir/$selected"
        echo "Moved to: $packages_dir/$selected"
        commandline -f repaint
    end
end
